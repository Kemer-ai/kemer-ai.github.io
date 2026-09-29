"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Building2, Users, Mail, Trash2, Plus, Crown,
  UserPlus, CheckCircle, AlertTriangle, Pencil, X, Save, Phone, MapPin,
} from "lucide-react";

const ROLE_LABELS = { responsable: "Responsable", praticien: "Praticien(ne)", secretaire: "Secrétaire" };

export default function CabinetAdminPage() {
  const router = useRouter();
  const [state, setState] = useState("loading");
  const [cabinet, setCabinet] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Create cabinet form
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ nom: "", adresse: "", phone: "" });

  // Edit cabinet
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nom: "", adresse: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete cabinet
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("praticien");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  // Remove member
  const [removing, setRemoving] = useState(null);

  // Pourcentage de reversement par membre
  const [pctDrafts, setPctDrafts] = useState({});
  const [pctSaving, setPctSaving] = useState(null);
  const [pctSaved, setPctSaved] = useState(null);

  async function loadCabinet() {
    const res = await fetch("/api/cabinet");
    const data = await res.json();
    if (data.error) {
      if (data.error.includes("Aucun cabinet")) setState("no-cabinet");
      else { setErrorMsg(data.error); setState("error"); }
    } else if (!data.isOwner) {
      // Non-responsable → page membre
      router.replace("/cabinet");
    } else {
      setCabinet(data);
      setEditForm({ nom: data.nom, adresse: data.adresse || "", phone: data.phone || "" });
      setState("ready");
    }
  }

  useEffect(() => { loadCabinet(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.nom.trim()) return;
    setCreating(true);
    const res = await fetch("/api/cabinet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const data = await res.json();
    setCreating(false);
    if (data.error) { setErrorMsg(data.error); setState("error"); }
    else loadCabinet();
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setEditError(null);
    if (!editForm.nom.trim()) { setEditError("Le nom du cabinet est requis."); return; }
    setSaving(true);
    const res = await fetch("/api/cabinet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setEditError(data.error); }
    else { setEditing(false); loadCabinet(); }
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/cabinet", { method: "DELETE" });
    setDeleting(false);
    setShowDeleteConfirm(false);
    router.push("/");
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    const res = await fetch("/api/cabinet/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();
    setInviting(false);
    if (data.error) setInviteMsg({ type: "error", text: data.error });
    else { setInviteMsg({ type: "success", text: `Invitation envoyée à ${inviteEmail.trim()}` }); setInviteEmail(""); loadCabinet(); }
  }

  async function handleRemove(memberId, memberName) {
    if (!confirm(`Retirer ${memberName} du cabinet ?`)) return;
    setRemoving(memberId);
    await fetch(`/api/cabinet/members/${memberId}`, { method: "DELETE" });
    setRemoving(null);
    loadCabinet();
  }

  async function handleSavePct(memberId) {
    const raw = pctDrafts[memberId];
    const pourcentageReversement = raw === "" || raw === undefined ? null : Number(raw);
    setPctSaving(memberId);
    setPctSaved(null);
    const res = await fetch(`/api/cabinet/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pourcentageReversement }),
    });
    const data = await res.json();
    setPctSaving(null);
    if (!data.error) {
      setPctSaved(memberId);
      setTimeout(() => setPctSaved(null), 1500);
      loadCabinet();
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#4931F7]" />
      </main>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 px-6 py-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium max-w-sm">
          <AlertTriangle size={18} className="shrink-0" /> {errorMsg}
        </div>
      </main>
    );
  }

  // ── Create cabinet ───────────────────────────────────────────────────────────
  if (state === "no-cabinet") {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50/50 dark:bg-[#0b1121] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#151e32] rounded-3xl border border-slate-100 dark:border-white/5 p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-[#4931F7]/10 rounded-2xl flex items-center justify-center mx-auto">
              <Building2 size={26} className="text-[#4931F7]" />
            </div>
            <h1 className="text-xl font-black text-[#001F3F] dark:text-white">Créer votre cabinet</h1>
            <p className="text-sm text-slate-500">Invitez vos collaborateurs et gérez votre équipe depuis un espace partagé.</p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nom du cabinet *</label>
              <input
                type="text"
                value={createForm.nom}
                onChange={e => setCreateForm({ ...createForm, nom: e.target.value })}
                placeholder="Cabinet de podologie Dupont"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
              <input
                type="text"
                value={createForm.adresse}
                onChange={e => setCreateForm({ ...createForm, adresse: e.target.value })}
                placeholder="12 rue de la Santé, 75014 Paris"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="01 23 45 67 89"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#4931F7] text-white rounded-xl text-sm font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Créer le cabinet
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Main admin view ──────────────────────────────────────────────────────────
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50/50 dark:bg-[#0b1121] p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#001F3F] dark:text-white">{cabinet?.nom}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestion du cabinet</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/cabinet/membres")}
              className="text-sm font-bold text-[#4931F7] hover:underline"
            >
              Membres et droits
            </button>
            <button
              onClick={() => router.push("/cabinet")}
              className="text-sm font-bold text-slate-500 hover:text-[#4931F7] transition-colors"
            >
              ← Vue membre
            </button>
          </div>
        </div>

        {/* Cabinet info — view or edit */}
        <div className="bg-white dark:bg-[#151e32] rounded-3xl border border-slate-100 dark:border-white/5 p-6">
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-black text-[#001F3F] dark:text-white">Modifier le cabinet</h2>
                <button type="button" onClick={() => { setEditing(false); setEditError(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nom *</label>
                <input
                  type="text"
                  value={editForm.nom}
                  onChange={e => setEditForm({ ...editForm, nom: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
                <input
                  type="text"
                  value={editForm.adresse}
                  onChange={e => setEditForm({ ...editForm, adresse: e.target.value })}
                  placeholder="12 rue de la Santé, 75014 Paris"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="01 23 45 67 89"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
                />
              </div>
              {editError && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                  <AlertTriangle size={13} /> {editError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setEditError(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#4931F7] text-white rounded-xl text-sm font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Enregistrer
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#4931F7]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-[#4931F7]" />
                  </div>
                  <div>
                    <p className="text-base font-black text-[#001F3F] dark:text-white">{cabinet?.nom}</p>
                    {cabinet?.adresse && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} /> {cabinet.adresse}
                      </p>
                    )}
                    {cabinet?.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {cabinet.phone}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#4931F7] hover:bg-[#4931F7]/10 transition-colors shrink-0"
                >
                  <Pencil size={13} /> Modifier
                </button>
              </div>

              {/* Delete zone */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                {showDeleteConfirm ? (
                  <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      Supprimer <strong>{cabinet?.nom}</strong> ?
                    </p>
                    <p className="text-xs text-red-500/80 dark:text-red-400/70 leading-relaxed">
                      Tous les membres seront détachés du cabinet. Les patients et consultations restent intacts. Cette action est irréversible.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-xs font-bold text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Supprimer définitivement
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} /> Supprimer le cabinet
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invite */}
        <div className="bg-white dark:bg-[#151e32] rounded-3xl border border-slate-100 dark:border-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={18} className="text-[#4931F7]" />
            <h2 className="text-base font-black text-[#001F3F] dark:text-white">Inviter un collaborateur</h2>
          </div>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@exemple.fr"
                required
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-[#001F3F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
              >
                <option value="praticien">Praticien(ne)</option>
                <option value="secretaire">Secrétaire</option>
              </select>
            </div>
            {inviteMsg && (
              <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl ${inviteMsg.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"}`}>
                {inviteMsg.type === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {inviteMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={inviting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#4931F7] text-white rounded-xl text-sm font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Envoyer l'invitation
            </button>
          </form>
        </div>

        {/* Invitations en attente */}
        {cabinet?.invitations?.length > 0 && (
          <div className="bg-white dark:bg-[#151e32] rounded-3xl border border-slate-100 dark:border-white/5 p-6">
            <h2 className="text-sm font-black text-[#001F3F] dark:text-white mb-4">
              Invitations en attente ({cabinet.invitations.length})
            </h2>
            <div className="space-y-2">
              {cabinet.invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div>
                    <p className="text-sm font-bold text-[#001F3F] dark:text-white">{inv.email}</p>
                    <p className="text-xs text-slate-400">{ROLE_LABELS[inv.role]} · expire le {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    En attente
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Membres */}
        <div className="bg-white dark:bg-[#151e32] rounded-3xl border border-slate-100 dark:border-white/5 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={18} className="text-[#4931F7]" />
            <h2 className="text-base font-black text-[#001F3F] dark:text-white">
              Membres ({cabinet?.membres?.length || 0})
            </h2>
          </div>
          <div className="space-y-3">
            {(cabinet?.membres || []).map(m => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#001F3F] dark:text-white truncate">
                    {m.prenom} {m.nom}
                    {m.cabinetRole === "responsable" && <Crown size={11} className="inline ml-1.5 text-[#4931F7]" />}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 shrink-0">
                  {ROLE_LABELS[m.cabinetRole] || m.cabinetRole}
                </span>
                {m.cabinetRole !== "responsable" && (
                  <>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="—"
                        value={pctDrafts[m.id] ?? (m.pourcentageReversement ?? "")}
                        onChange={e => setPctDrafts({ ...pctDrafts, [m.id]: e.target.value })}
                        className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-[#001F3F] dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-[#4931F7]/40"
                      />
                      <span className="text-xs text-slate-400 font-bold">% reversé</span>
                      <button
                        onClick={() => handleSavePct(m.id)}
                        disabled={pctSaving === m.id}
                        className="p-1.5 text-slate-400 hover:text-[#4931F7] transition-colors disabled:opacity-40"
                        title="Enregistrer le pourcentage"
                      >
                        {pctSaving === m.id ? <Loader2 size={13} className="animate-spin" /> : pctSaved === m.id ? <CheckCircle size={13} className="text-emerald-500" /> : <Save size={13} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(m.id, `${m.prenom} ${m.nom}`)}
                      disabled={removing === m.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
                    >
                      {removing === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Le pourcentage reversé correspond à la part du chiffre d'affaires de chaque collaborateur qui revient au responsable du cabinet (loyer, matériel, etc.). Laissez vide pour ne pas répartir les recettes de ce membre.
          </p>
        </div>

      </div>
    </main>
  );
}
