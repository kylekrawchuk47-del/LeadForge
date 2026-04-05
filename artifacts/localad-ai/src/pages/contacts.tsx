import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { usePlan } from "@/hooks/use-plan";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Pencil,
  Mail,
  Phone,
  Building2,
  Tag,
  Upload,
  MoreHorizontal,
  MessageSquare,
  FileText,
  CheckCircle,
  Sparkles,
  Copy,
  Check,
  X,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

// ─── Types & Constants ────────────────────────────────────────────────────────

type Contact = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  tags: string | null;
  leadStatus: string;
  source: string | null;
  consentStatus: string;
  notes: string | null;
  dateAdded: string;
};

type ContactForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  tags: string;
  leadStatus: string;
  source: string;
  consentStatus: string;
  notes: string;
};

const EMPTY_FORM: ContactForm = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  tags: "",
  leadStatus: "new_lead",
  source: "manual",
  consentStatus: "no_consent",
  notes: "",
};

const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  new_lead:          { label: "New Lead",          color: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  warm_lead:         { label: "Warm Lead",         color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  quote_sent:        { label: "Quote Sent",        color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  follow_up_needed:  { label: "Follow-up Needed",  color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  won:               { label: "Won ✓",             color: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500" },
  lost:              { label: "Lost",              color: "bg-red-50 text-red-500 border-red-200",       dot: "bg-red-400" },
  past_customer:     { label: "Past Customer",     color: "bg-teal-50 text-teal-700 border-teal-200",    dot: "bg-teal-500" },
};

const SOURCE_LABELS: Record<string, string> = {
  website:           "Website",
  referral:          "Referral",
  google_ads:        "Google Ads",
  facebook_ads:      "Facebook Ads",
  flyer:             "Flyer / Door Hanger",
  previous_customer: "Previous Customer",
  manual:            "Manually Added",
  imported:          "CSV Import",
};

const TAG_OPTIONS = ["lead", "customer", "past customer", "referral", "supplier"];

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "new_lead", label: "New Lead" },
  { key: "warm_lead", label: "Warm Lead" },
  { key: "quote_sent", label: "Quote Sent" },
  { key: "follow_up_needed", label: "Follow-up" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "past_customer", label: "Past Customer" },
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    return headers.reduce<Record<string, string>>((obj, h, i) => {
      obj[h] = vals[i] ?? "";
      return obj;
    }, {});
  });
}

function csvRowToContact(row: Record<string, string>): Partial<ContactForm> {
  const get = (...keys: string[]) => keys.map(k => row[k]).find(v => v) ?? "";
  const firstName = get("first_name", "firstname", "first");
  const lastName = get("last_name", "lastname", "last");
  const fullName = get("name", "full_name");
  return {
    email: get("email", "email_address"),
    firstName: firstName || (fullName ? fullName.split(" ")[0] : ""),
    lastName: lastName || (fullName ? fullName.split(" ").slice(1).join(" ") : ""),
    phone: get("phone", "phone_number", "mobile", "cell"),
    company: get("company", "business", "organization"),
    tags: get("tags"),
    notes: get("notes", "note"),
    source: "imported",
    leadStatus: "new_lead",
    consentStatus: "no_consent",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = LEAD_STATUS_CONFIG[status] ?? LEAD_STATUS_CONFIG.new_lead;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-medium border border-border/40 whitespace-nowrap">
      {tag}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs font-medium text-gray-600 hover:bg-muted/20 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Contacts() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { canUseContacts, isLoading: planLoading } = usePlan();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Import CSV dialog
  const [importOpen, setImportOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<Partial<ContactForm>[]>([]);
  const [importing, setImporting] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  // Quick action dialogs
  const [noteContact, setNoteContact] = useState<Contact | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [statusContact, setStatusContact] = useState<Contact | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const [aiContact, setAiContact] = useState<Contact | null>(null);
  const [aiMode, setAiMode] = useState<"email" | "sms">("email");
  const [aiResult, setAiResult] = useState<{ subject?: string; body: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  async function loadContacts() {
    setLoading(true);
    try {
      const res = await apiFetch("/contacts");
      if (res.ok) setContacts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadContacts(); }, []);

  // Close action menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = contacts.filter(c => {
    if (statusFilter !== "all" && c.leadStatus !== statusFilter) return false;
    if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.email.toLowerCase().includes(q) ||
      (c.firstName ?? "").toLowerCase().includes(q) ||
      (c.lastName ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  const stats = {
    total: contacts.length,
    newLeads: contacts.filter(c => c.leadStatus === "new_lead").length,
    followUp: contacts.filter(c => c.leadStatus === "follow_up_needed").length,
    won: contacts.filter(c => c.leadStatus === "won").length,
  };

  function fullName(c: Contact) {
    const n = [c.firstName, c.lastName].filter(Boolean).join(" ");
    return n || c.email.split("@")[0];
  }

  function initials(c: Contact) {
    const fn = c.firstName ?? "";
    const ln = c.lastName ?? "";
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    if (fn) return fn[0].toUpperCase();
    return c.email[0].toUpperCase();
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c: Contact) {
    setEditingId(c.id);
    setForm({
      email: c.email,
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      tags: c.tags ?? "",
      leadStatus: c.leadStatus,
      source: c.source ?? "manual",
      consentStatus: c.consentStatus,
      notes: c.notes ?? "",
    });
    setFormOpen(true);
    setOpenMenuId(null);
  }

  async function saveContact() {
    if (!form.email) { toast({ title: "Email is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const path = editingId ? `/contacts/${editingId}` : "/contacts";
      const res = await apiFetch(path, { method, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: editingId ? "Contact updated" : "Contact added" });
      setFormOpen(false);
      await loadContacts();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: number) {
    setDeletingId(id);
    setOpenMenuId(null);
    try {
      await apiFetch(`/contacts/${id}`, { method: "DELETE" });
      setContacts(prev => prev.filter(c => c.id !== id));
      toast({ title: "Contact deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  // ── CSV Import ───────────────────────────────────────────────────────────────

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const rows = parseCSV(text).map(csvRowToContact).filter(r => r.email);
      setCsvRows(rows);
      setImportOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function importContacts() {
    if (!csvRows.length) return;
    setImporting(true);
    try {
      const res = await apiFetch("/contacts/bulk", {
        method: "POST",
        body: JSON.stringify({
          contacts: csvRows.map(r => ({
            email: r.email ?? "",
            firstName: r.firstName ?? "",
            lastName: r.lastName ?? "",
            phone: r.phone ?? "",
            company: r.company ?? "",
            tags: r.tags ?? "",
            leadStatus: "new_lead",
            source: "imported",
            consentStatus: "no_consent",
            notes: r.notes ?? "",
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast({ title: `${data.imported} contacts imported successfully` });
      setImportOpen(false);
      setCsvRows([]);
      await loadContacts();
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  // ── Quick Actions ────────────────────────────────────────────────────────────

  async function saveNote() {
    if (!noteContact || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const existing = noteContact.notes ?? "";
      const timestamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const appended = existing ? `${existing}\n\n[${timestamp}] ${noteText.trim()}` : `[${timestamp}] ${noteText.trim()}`;
      const res = await apiFetch(`/contacts/${noteContact.id}`, {
        method: "PUT",
        body: JSON.stringify({ notes: appended }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Note saved" });
      setNoteContact(null);
      setNoteText("");
      await loadContacts();
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  }

  async function updateStatus() {
    if (!statusContact || !newStatus) return;
    try {
      const res = await apiFetch(`/contacts/${statusContact.id}`, {
        method: "PUT",
        body: JSON.stringify({ leadStatus: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Status updated" });
      setStatusContact(null);
      await loadContacts();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  }

  async function generateAI(contact: Contact, mode: "email" | "sms") {
    setAiContact(contact);
    setAiMode(mode);
    setAiResult(null);
    setAiLoading(true);
    setOpenMenuId(null);

    try {
      const name = fullName(contact);
      const res = await apiFetch("/generate/follow-up", {
        method: "POST",
        body: JSON.stringify({
          channel: mode,
          count: 1,
          businessName: "",
          category: "",
          location: "",
          services: "",
          offer: contact.notes ?? "",
          tone: "friendly",
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const msg = data.messages?.[0];
      if (msg) {
        setAiResult({ subject: msg.subject, body: msg.body.replace(/\[Name\]/g, contact.firstName ?? name) });
      }
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (!planLoading && !canUseContacts) {
    return (
      <UpgradePrompt
        feature="Contact Management"
        description="Track leads, manage follow-ups, and organize your customer pipeline — all in one place. Available on Pro and Agency plans."
        highlights={[
          "Full CRM for managing leads and customers",
          "Track lead status from new lead to closed deal",
          "Import contacts via CSV",
          "Send targeted emails directly from contact profiles",
          "Advanced lead scoring (Agency plan)",
        ]}
        planRequired="pro"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track leads, follow-ups, and customers in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
          <Button
            variant="outline"
            onClick={() => csvRef.current?.click()}
            className="gap-2 h-9 px-4 text-sm font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <Button
            onClick={openAdd}
            className="gap-2 bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white rounded-lg h-9 px-4 text-sm font-semibold shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contacts", value: stats.total, color: "text-gray-900" },
          { label: "New Leads", value: stats.newLeads, color: "text-blue-600" },
          { label: "Follow-up Needed", value: stats.followUp, color: "text-orange-600" },
          { label: "Won", value: stats.won, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/40 rounded-xl p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-card border border-border/40 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-100">
          {/* Status tabs */}
          <div className="flex items-center gap-0.5 px-4 pt-3 overflow-x-auto scrollbar-hide">
            {STATUS_TABS.map(t => {
              const count = t.key === "all" ? contacts.length : contacts.filter(c => c.leadStatus === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                    statusFilter === t.key
                      ? "border-[hsl(213,89%,50%)] text-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]/5"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      statusFilter === t.key ? "bg-[hsl(213,89%,50%)]/15 text-[hsl(213,89%,50%)]" : "bg-gray-100 text-gray-400"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + source filter */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, phone…"
                className="pl-9 h-8 text-xs border-gray-200 rounded-lg"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-xs w-40 border-gray-200">
                <Filter className="w-3 h-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 ml-auto">
              {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm">Loading contacts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <Users className="w-10 h-10 text-gray-300" />
            <div className="text-center">
              <p className="font-semibold text-gray-500">
                {contacts.length === 0 ? "No contacts yet" : "No contacts match your filters"}
              </p>
              <p className="text-sm mt-0.5 text-gray-400">
                {contacts.length === 0
                  ? "Add your first contact or import a CSV."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
            {contacts.length === 0 && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} className="gap-1.5 text-xs">
                  <Upload className="w-3.5 h-3.5" />Import CSV
                </Button>
                <Button size="sm" onClick={openAdd} className="gap-1.5 text-xs bg-[hsl(213,89%,50%)] text-white hover:bg-[hsl(213,89%,44%)]">
                  <UserPlus className="w-3.5 h-3.5" />Add Contact
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    {["Contact", "Phone", "Company", "Tags", "Status", "Source", "Added", ""].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[hsl(213,89%,50%)]/10 flex items-center justify-center text-[hsl(213,89%,50%)] font-bold text-xs shrink-0 border border-[hsl(213,89%,50%)]/20">
                            {initials(c)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{fullName(c)}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-2.5 h-2.5" />{c.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-[hsl(213,89%,50%)] transition-colors">
                            <Phone className="w-3 h-3" />{c.phone}
                          </a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {c.company || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        {c.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {c.tags.split(",").slice(0, 2).map(t => <TagChip key={t} tag={t.trim()} />)}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3"><StatusBadge status={c.leadStatus} /></td>

                      {/* Source */}
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {SOURCE_LABELS[c.source ?? ""] ?? c.source ?? <span className="text-gray-300">—</span>}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(c.dateAdded).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === c.id && (
                            <div className="absolute right-0 top-8 z-30 bg-card border border-border/40 rounded-xl shadow-xl py-1.5 w-52 text-xs">
                              <button
                                onClick={() => { generateAI(c, "email"); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/20 text-gray-700 transition-colors"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[hsl(213,89%,50%)]" />
                                Generate Follow-up Email
                              </button>
                              <button
                                onClick={() => { generateAI(c, "sms"); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/20 text-gray-700 transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                                Generate SMS Template
                              </button>
                              <div className="h-px bg-gray-100 my-1" />
                              <button
                                onClick={() => { setNoteContact(c); setNoteText(""); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/20 text-gray-700 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-500" />
                                Add Note
                              </button>
                              <button
                                onClick={() => { setStatusContact(c); setNewStatus(c.leadStatus); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/20 text-gray-700 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-teal-500" />
                                Update Status
                              </button>
                              <div className="h-px bg-gray-100 my-1" />
                              <button
                                onClick={() => openEdit(c)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/20 text-gray-700 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                Edit Contact
                              </button>
                              <button
                                onClick={() => deleteContact(c.id)}
                                disabled={deletingId === c.id}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-red-50 text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </>
        )}
      </div>

      {/* CSV Template hint */}
      <div className="bg-[hsl(213,89%,50%)]/5 border border-[hsl(213,89%,50%)]/15 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-[hsl(213,89%,50%)] mb-1">CSV Import Format</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your CSV should include columns: <code className="bg-card border border-border/40 rounded px-1 py-0.5 font-mono text-[11px]">name</code>, <code className="bg-card border border-border/40 rounded px-1 py-0.5 font-mono text-[11px]">email</code>, <code className="bg-card border border-border/40 rounded px-1 py-0.5 font-mono text-[11px]">phone</code>, <code className="bg-card border border-border/40 rounded px-1 py-0.5 font-mono text-[11px]">company</code>, <code className="bg-card border border-border/40 rounded px-1 py-0.5 font-mono text-[11px]">notes</code>.
          All imported contacts start as "New Lead" status. Duplicate emails are not checked automatically.
        </p>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">First Name</label>
                <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Last Name</label>
                <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Smith" className="text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Email <span className="text-red-500">*</span></label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" type="email" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" type="tel" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Company</label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Smith Roofing LLC" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
                <Select value={form.leadStatus} onValueChange={v => setForm(f => ({ ...f, leadStatus: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Source</label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="lead, referral" className="text-sm" />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {TAG_OPTIONS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const tags = form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [];
                      const idx = tags.indexOf(t);
                      const next = idx >= 0 ? tags.filter(x => x !== t) : [...tags, t];
                      setForm(f => ({ ...f, tags: next.join(", ") }));
                    }}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      form.tags.split(",").map(s => s.trim()).includes(t)
                        ? "bg-[hsl(213,89%,50%)] border-[hsl(213,89%,50%)] text-white"
                        : "bg-gray-100 border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Email Consent</label>
              <Select value={form.consentStatus} onValueChange={v => setForm(f => ({ ...f, consentStatus: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribed">✅ Subscribed — opted in to marketing</SelectItem>
                  <SelectItem value="unsubscribed">🚫 Unsubscribed — opted out</SelectItem>
                  <SelectItem value="transactional_only">📧 Transactional Only</SelectItem>
                  <SelectItem value="no_consent">⚠️ No Consent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="How did they find you? Any context about their project…" className="text-sm resize-none h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} className="text-sm">Cancel</Button>
            <Button onClick={saveContact} disabled={saving} className="bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import Preview Dialog ─────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Contacts — Preview</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-500">
              Found <strong>{csvRows.length}</strong> contact{csvRows.length !== 1 ? "s" : ""} in your CSV. Review below before importing.
            </p>
            <div className="border border-border/40 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/20 sticky top-0">
                  <tr>
                    {["Name", "Email", "Phone", "Company"].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {csvRows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-medium text-gray-800">{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{r.email}</td>
                      <td className="px-3 py-2 text-gray-500">{r.phone || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{r.company || "—"}</td>
                    </tr>
                  ))}
                  {csvRows.length > 20 && (
                    <tr><td colSpan={4} className="px-3 py-2 text-center text-gray-400">…and {csvRows.length - 20} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">All contacts will be imported as <strong>New Lead</strong> status with <strong>No Consent</strong> for email marketing.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setCsvRows([]); }} className="text-sm">Cancel</Button>
            <Button onClick={importContacts} disabled={importing} className="bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm">
              {importing ? "Importing…" : `Import ${csvRows.length} Contact${csvRows.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Note Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!noteContact} onOpenChange={open => !open && setNoteContact(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Note — {noteContact ? fullName(noteContact) : ""}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="What happened? Next steps, what they said…"
              className="text-sm resize-none h-28"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteContact(null)} className="text-sm">Cancel</Button>
            <Button onClick={saveNote} disabled={savingNote || !noteText.trim()} className="bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm">
              {savingNote ? "Saving…" : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Status Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!statusContact} onOpenChange={open => !open && setStatusContact(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-gray-500 mb-3">
              {statusContact ? fullName(statusContact) : ""}
            </p>
            {Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setNewStatus(k)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                  newStatus === k ? "border-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]/5" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${v.dot}`} />
                <span className="text-sm font-medium text-gray-800">{v.label}</span>
                {newStatus === k && <Check className="w-4 h-4 text-[hsl(213,89%,50%)] ml-auto" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusContact(null)} className="text-sm">Cancel</Button>
            <Button onClick={updateStatus} className="bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI Generate Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!aiContact} onOpenChange={open => { if (!open) { setAiContact(null); setAiResult(null); }}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {aiMode === "email" ? "✉️ Follow-up Email" : "💬 SMS Template"} — {aiContact ? fullName(aiContact) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {aiLoading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Writing your {aiMode === "email" ? "email" : "message"}…</p>
              </div>
            ) : aiResult ? (
              <div className="space-y-4">
                {aiMode === "email" && aiResult.subject && (
                  <div className="bg-muted/20 rounded-lg p-3 border border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Subject</p>
                      <CopyButton text={aiResult.subject} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{aiResult.subject}</p>
                  </div>
                )}
                <div className="bg-muted/20 rounded-lg p-3 border border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                      {aiMode === "email" ? "Email Body" : "SMS Message"}
                    </p>
                    <CopyButton text={aiResult.body} />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResult.body}</p>
                </div>
                <p className="text-xs text-gray-400">
                  {aiMode === "sms"
                    ? "Copy this message and paste it into your SMS app."
                    : "Copy this email and paste it into your email client."}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400">
                <p className="text-sm">Something went wrong. Try again.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAiContact(null); setAiResult(null); }} className="text-sm">Close</Button>
            {aiResult && (
              <CopyButton text={aiResult.subject ? `Subject: ${aiResult.subject}\n\n${aiResult.body}` : aiResult.body} />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
