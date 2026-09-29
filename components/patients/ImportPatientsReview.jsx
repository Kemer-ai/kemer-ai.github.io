"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, CheckCircle2 } from "lucide-react";

const PAGE_SIZE = 25;

function normalizeKey(nom, prenom) {
  return `${(nom || "").trim().toLowerCase()}|${(prenom || "").trim().toLowerCase()}`;
}

// Import par défaut : pont postMessage vers l'extension Kemer (flux Doctolib).
function requestImportViaExtension(patients) {
  return new Promise(resolve => {
    function onMessage(event) {
      if (event.source !== window || event.data?.source !== "kemer-extension") return;
      if (event.data.type !== "KEMER_IMPORT_RESULT") return;
      window.removeEventListener("message", onMessage);
      resolve(event.data);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "kemer-import-page", type: "KEMER_CONFIRM_IMPORT", patients }, "*");
  });
}

export default function ImportPatientsReview({
  rawPatients,
  praticienId,
  sourceLabel = "Doctolib",
  onConfirm = requestImportViaExtension,
  onCancel,
  onExit,
}) {
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [existingKeys, setExistingKeys] = useState(new Set());
  const [overrides, setOverrides] = useState(new Map());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/patients", { headers: praticienId ? { "X-Praticien-Id": praticienId } : {} })
      .then(res => (res.ok ? res.json() : { patients: [] }))
      .then(data => {
        if (cancelled) return;
        const keys = new Set((data.patients || []).map(p => normalizeKey(p.nom, p.prenom)));
        setExistingKeys(keys);
        setExistingLoaded(true);
      })
      .catch(() => !cancelled && setExistingLoaded(true));
    return () => { cancelled = true; };
  }, [praticienId]);

  const rows = useMemo(() => {
    if (!existingLoaded) return [];
    return rawPatients.map((p, i) => {
      const isDuplicate = existingKeys.has(normalizeKey(p.nom, p.prenom));
      const selected = overrides.has(i) ? overrides.get(i) : !isDuplicate;
      return { ...p, _id: i, _isDuplicate: isDuplicate, _selected: selected };
    });
  }, [existingLoaded, existingKeys, rawPatients, overrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      `${r.nom} ${r.prenom} ${r.email || ""} ${r.telephone || ""} ${r.ville || ""}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedCount = rows.filter(r => r._selected).length;

  function toggleRow(id) {
    setOverrides(prev => {
      const next = new Map(prev);
      const row = rows.find(r => r._id === id);
      next.set(id, !row._selected);
      return next;
    });
  }

  function toggleAllOnPage(checked) {
    setOverrides(prev => {
      const next = new Map(prev);
      pageRows.forEach(r => next.set(r._id, checked));
      return next;
    });
  }

  async function handleImport() {
    const selected = rows.filter(r => r._selected);
    if (selected.length === 0) return;
    setImporting(true);
    const res = await onConfirm(selected.map(({ _id, _isDuplicate, _selected, ...p }) => p));
    setImporting(false);
    setResult(res);
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else window.postMessage({ source: "kemer-import-page", type: "KEMER_CANCEL_IMPORT" }, "*");
    onExit();
  }

  if (!existingLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0b1121]">
        <Loader2 size={40} className="text-[#4931F7] animate-spin mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Préparation de l&apos;import…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0b1121] px-4 text-center">
        {result.success ? (
          <>
            <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
            <h1 className="text-2xl font-black text-[#001F3F] dark:text-white mb-2">
              {result.count ?? selectedCount} patient(s) importé(s)
            </h1>
          </>
        ) : (
          <h1 className="text-2xl font-black text-[#001F3F] dark:text-white mb-2">
            Échec de l&apos;import{result.error ? ` : ${result.error}` : ""}
          </h1>
        )}
        <button
          onClick={onExit}
          className="mt-4 px-6 py-3 rounded-xl bg-[#4931F7] text-white font-bold hover:bg-[#3b26c6] transition-colors"
        >
          Voir mes patients
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b1121] transition-colors duration-300 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-black text-[#001F3F] dark:text-white tracking-tighter">
          Import <span className="text-[#4931F7]">{sourceLabel}</span>
        </h1>
        <p className="text-sm text-gray-400 font-medium mt-1 mb-6">
          {rows.length} patient(s) trouvé(s). Les patients déjà présents dans Kemer (même nom et prénom)
          sont grisés et décochés — vous pouvez ajuster la sélection avant d&apos;importer.
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un patient…"
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111a2e] text-sm outline-none focus:border-[#4931F7] focus:ring-2 focus:ring-[#4931F7]/10"
          />
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#111a2e]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0b1121] text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every(r => r._selected)}
                    onChange={e => toggleAllOnPage(e.target.checked)}
                  />
                </th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Prénom</th>
                <th className="px-4 py-3 hidden sm:table-cell">Téléphone</th>
                <th className="px-4 py-3 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 hidden lg:table-cell">Ville</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => (
                <tr
                  key={r._id}
                  className={`border-t border-gray-100 dark:border-gray-800 ${r._isDuplicate ? "opacity-45 bg-gray-50 dark:bg-gray-900/40" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={r._selected} onChange={() => toggleRow(r._id)} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#001F3F] dark:text-white">
                    {r.nom}
                    {r._isDuplicate && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-amber-500">déjà existant</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.prenom}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{r.telephone}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500">{r.email}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{r.ville}</td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Aucun patient ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-400 font-medium">
            Page {currentPage} / {pageCount}
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              disabled={currentPage >= pageCount}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            onClick={handleImport}
            disabled={importing || selectedCount === 0}
            className="px-6 py-3 rounded-xl bg-[#4931F7] text-white font-bold hover:bg-[#3b26c6] transition-colors disabled:opacity-50"
          >
            {importing ? "Import en cours…" : `Importer la sélection (${selectedCount})`}
          </button>
          <button
            onClick={handleCancel}
            disabled={importing}
            className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
