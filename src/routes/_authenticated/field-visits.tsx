import "leaflet/dist/leaflet.css";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Download,
  Eraser,
  FileUp,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Route as RouteIcon,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  coverageCsvTemplate,
  coverageMetrics,
  analyzeFieldVisitCsv,
  normalizeCoverageUnit,
  priorityLabel,
  sortByAttention,
  type CoverageUnit,
  type FieldVisitCsvAnalysis,
  type FieldVisitPlan,
  type FieldVisitRecord,
  type FieldVisitUnitWithRecords,
  type VisitStatus,
} from "@/lib/fieldVisits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/field-visits")({
  component: FieldVisitsPage,
});

const ALL = "__all__";
const DISMISSED_FALLBACK_VISITS_STORAGE_KEY = "field-visit-dismissed-fallback-visits";
const LOCAL_FIELD_VISIT_STORAGE_PREFIX = "field-visit-local-store-v4";
const FIELD_VISIT_NOTEPAD_STORAGE_PREFIX = "field-visit-notepad";
const DANTEWADA_GP_COUNT = 169;
const visitFormSchema = z.object({
  visitedOn: z
    .string()
    .min(1, "Visit date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid visit date")
    .refine(isValidInputDate, "Use a valid visit date"),
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
});

type VisitFormValues = z.infer<typeof visitFormSchema>;

type UnitUpsertRow = {
  owner_id: string;
  administrative_unit: string;
  block_name: string;
  gp_name: string;
  latitude: number | null;
  longitude: number | null;
  is_legacy: boolean;
  priority_score: number;
};

type PlanInsertRow = {
  owner_id: string;
  title: string;
  plan_date: string;
  notes: string | null;
  status: FieldVisitPlan["status"];
};

type PlanItemInsertRow = {
  plan_id: string;
  unit_id: string;
  route_order: number;
  message: string | null;
};

type FieldVisitPlanItem = {
  id: string;
  plan_id: string;
  unit_id: string;
  route_order: number;
  assigned_to: string | null;
  message: string | null;
  created_at: string;
};

type FieldVisitPlanWithItems = FieldVisitPlan & {
  field_visit_plan_items?: FieldVisitPlanItem[];
};

type CsvImportPreview = FieldVisitCsvAnalysis & {
  fileName: string;
};

type CsvImportImpact = {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
};

type SupabaseResult<T> = {
  data: T | null;
  error: Error | null;
};

type DeleteVisitRecordsArgs = {
  ids: string[];
  action: "clear" | "undo";
};

type MarkVisitArgs = {
  status: "visited" | "legacy";
  values: VisitFormValues;
  units: CoverageUnit[];
};

type VisitRecordInsertRow = Pick<
  FieldVisitRecord,
  "unit_id" | "visited_on" | "status" | "notes" | "recorded_by"
>;

type CreateDraftPlanInput = {
  title: string;
  planDate: string;
  unitIds: string[];
  notes?: string;
  time?: string;
  duration?: string;
  status?: FieldVisitPlan["status"];
};

type ThenableSupabaseResult<T> = PromiseLike<SupabaseResult<T>>;

type LocalFieldVisitStore = {
  units: FieldVisitUnitWithRecords[];
  records: FieldVisitRecord[];
  plans: FieldVisitPlanWithItems[];
  planItems: FieldVisitPlanItem[];
};

type FieldVisitSelectBuilder<T> = ThenableSupabaseResult<T[]> & {
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => FieldVisitSelectBuilder<T>;
  limit: (count: number) => ThenableSupabaseResult<T[]>;
};

type FieldVisitDb = {
  from(table: "field_visit_records"): {
    insert: (rows: unknown[]) => {
      select: (columns: string) => ThenableSupabaseResult<FieldVisitRecord[]>;
    };
    delete: () => {
      in: (column: string, values: string[]) => ThenableSupabaseResult<null>;
    };
  };
  from(table: "field_visit_units"): {
    select: (columns: string) => FieldVisitSelectBuilder<FieldVisitUnitWithRecords>;
    delete: () => {
      eq: (column: string, value: string | undefined) => ThenableSupabaseResult<null>;
      in: (column: string, values: string[]) => ThenableSupabaseResult<null>;
    };
    insert: (rows: UnitUpsertRow[]) => ThenableSupabaseResult<null>;
    upsert: (
      rows: UnitUpsertRow[],
      options?: { onConflict?: string },
    ) => ThenableSupabaseResult<null>;
  };
  from(table: "field_visit_plans"): {
    select: (columns: string) => FieldVisitSelectBuilder<FieldVisitPlanWithItems>;
    insert: (row: PlanInsertRow) => {
      select: (columns: string) => {
        single: () => ThenableSupabaseResult<FieldVisitPlan>;
      };
    };
    update: (row: Partial<Pick<FieldVisitPlan, "status" | "notes" | "plan_date" | "title">>) => {
      eq: (column: string, value: string) => ThenableSupabaseResult<null>;
    };
    delete: () => {
      eq: (column: string, value: string) => ThenableSupabaseResult<null>;
    };
  };
  from(table: "field_visit_plan_items"): {
    insert: (rows: PlanItemInsertRow[]) => ThenableSupabaseResult<null>;
  };
};

function fieldVisitDb() {
  return supabase as unknown as FieldVisitDb;
}

function FieldVisitsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [administrativeUnit, setAdministrativeUnit] = useState(ALL);
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<VisitStatus | typeof ALL>(ALL);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastRecords, setLastRecords] = useState<FieldVisitRecord[]>([]);
  const [showGpName, setShowGpName] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<"visited" | "legacy" | null>(null);
  const [deleteAction, setDeleteAction] = useState<DeleteVisitRecordsArgs["action"] | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvImportPreview | null>(null);
  const [dismissedFallbackVisitIds, setDismissedFallbackVisitIds] = useState(
    readDismissedFallbackVisitIds,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      visitedOn: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const unitsQuery = useQuery({
    queryKey: ["field-visit-units", user?.id],
    queryFn: () => loadFieldVisitUnits(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: ["field-visit-plans", user?.id],
    queryFn: () => loadFieldVisitPlans(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const units = useMemo(
    () => (unitsQuery.data ?? []).map((unit) => normalizeCoverageUnit(unit)),
    [unitsQuery.data],
  );
  const administrativeUnits = useMemo(
    () => Array.from(new Set(units.map((unit) => unit.administrative_unit))).sort(),
    [units],
  );
  const scopedUnits = useMemo(
    () =>
      units.filter(
        (unit) => administrativeUnit === ALL || unit.administrative_unit === administrativeUnit,
      ),
    [administrativeUnit, units],
  );
  const blocks = useMemo(
    () => Array.from(new Set(scopedUnits.map((unit) => unit.block_name))).sort(),
    [scopedUnits],
  );
  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedUnits.filter((unit) => {
      const matchesText =
        !query || `${unit.gp_name} ${unit.block_name}`.toLowerCase().includes(query);
      const matchesBlock = blockFilter === ALL || unit.block_name === blockFilter;
      const matchesStatus = statusFilter === ALL || unit.status === statusFilter;
      return matchesText && matchesBlock && matchesStatus;
    });
  }, [blockFilter, scopedUnits, search, statusFilter]);
  const pendingVisible = useMemo(
    () => filteredUnits.filter((unit) => unit.status === "pending"),
    [filteredUnits],
  );
  const selectedUnits = useMemo(
    () => units.filter((unit) => selectedIds.has(unit.id)),
    [selectedIds, units],
  );
  const selectedRecordIds = useMemo(
    () =>
      selectedUnits.flatMap(
        (unit) =>
          unit.field_visit_records
            ?.map((record) => record.id)
            .filter((id) => !id.startsWith("optimistic-")) ?? [],
      ),
    [selectedUnits],
  );
  const metrics = useMemo(() => coverageMetrics(scopedUnits), [scopedUnits]);
  const attentionUnits = useMemo(
    () =>
      [...scopedUnits]
        .filter((unit) => unit.status !== "visited")
        .sort(sortByAttention)
        .slice(0, 6),
    [scopedUnits],
  );
  const blockSummaries = useMemo(() => buildBlockSummaries(scopedUnits).slice(0, 5), [scopedUnits]);
  const recentWins = useMemo(
    () =>
      scopedUnits
        .filter((unit) => unit.lastVisit && unit.status === "visited")
        .sort((a, b) =>
          (b.lastVisit?.visited_on ?? "").localeCompare(a.lastVisit?.visited_on ?? ""),
        )
        .slice(0, 5),
    [scopedUnits],
  );
  const plans = plansQuery.data ?? [];
  const proposedVisits = useMemo(() => {
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const savedPlans = plans.map((plan) => planToProposedVisit(plan, unitById));
    if (savedPlans.length > 0) return savedPlans;

    const firstIds = attentionUnits.slice(0, 1).map((unit) => unit.id);
    const secondIds = attentionUnits.slice(1, 4).map((unit) => unit.id);
    return [
      {
        id: "fallback-science-park",
        title: "Science Park Visit",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "10:00",
        duration: "30 min",
        status: "draft" as const,
        unitIds: firstIds,
        notes: "Auto draft from highest attention GP",
        isSaved: false,
      },
      {
        id: "fallback-van-mahotsav",
        title: "Van Mahotsav Vriksharopan Programme",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "12:00",
        duration: "120 min",
        status: "draft" as const,
        unitIds: secondIds.length ? secondIds : firstIds,
        notes: "Auto draft from priority route",
        isSaved: false,
      },
    ].filter((visit) => !dismissedFallbackVisitIds.has(visit.id));
  }, [attentionUnits, dismissedFallbackVisitIds, plans, units]);

  const markVisitMutation = useMutation({
    mutationFn: async ({ status, values, units: targetUnits }: MarkVisitArgs) => {
      if (!user?.id) throw new Error("Sign in required to mark field visits.");
      if (targetUnits.length === 0) throw new Error("Select at least one GP.");
      const payload = targetUnits.map((unit) => ({
        unit_id: unit.id,
        visited_on: values.visitedOn,
        status,
        notes: values.notes?.trim() || null,
        recorded_by: user.id,
      }));
      const { data, error } = await fieldVisitDb()
        .from("field_visit_records")
        .insert(payload)
        .select("*");
      if (error && isMissingFieldVisitSchemaError(error)) {
        return saveLocalVisitRecords(user.id, payload);
      }
      if (error) throw error;
      return data as FieldVisitRecord[];
    },
    onMutate: async ({ status, values, units: targetUnits }) => {
      await queryClient.cancelQueries({ queryKey: ["field-visit-units", user?.id] });
      const previous = queryClient.getQueryData<FieldVisitUnitWithRecords[]>([
        "field-visit-units",
        user?.id,
      ]);
      const targetIds = new Set(targetUnits.map((unit) => unit.id));
      const optimisticRecords = targetUnits.map((unit) => ({
        id: `optimistic-${unit.id}`,
        unit_id: unit.id,
        visited_on: values.visitedOn,
        status,
        notes: values.notes?.trim() || null,
        recorded_by: user?.id ?? null,
        created_at: new Date().toISOString(),
      }));
      queryClient.setQueryData<FieldVisitUnitWithRecords[]>(
        ["field-visit-units", user?.id],
        (current = []) =>
          current.map((unit) =>
            targetIds.has(unit.id)
              ? {
                  ...unit,
                  is_legacy: status === "legacy" ? true : unit.is_legacy,
                  field_visit_records: [
                    ...optimisticRecords.filter((record) => record.unit_id === unit.id),
                    ...(unit.field_visit_records ?? []),
                  ],
                }
              : unit,
          ),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["field-visit-units", user?.id], context.previous);
      }
      toast.error(error instanceof Error ? error.message : "Visit update failed");
    },
    onSuccess: (records) => {
      setLastRecords(records);
      setSelectedIds(new Set());
      form.reset({ visitedOn: form.getValues("visitedOn"), notes: "" });
      toast.success(`${records.length} visit record${records.length === 1 ? "" : "s"} saved`);
    },
    onSettled: () => {
      setMarkingStatus(null);
      void queryClient.invalidateQueries({ queryKey: ["field-visit-units", user?.id] });
    },
  });

  const deleteRecordsMutation = useMutation({
    mutationFn: async ({ ids, action }: DeleteVisitRecordsArgs) => {
      const { error } = await fieldVisitDb().from("field_visit_records").delete().in("id", ids);
      if (error && isMissingFieldVisitSchemaError(error)) {
        if (!user?.id) throw new Error("Sign in required to clear visit records.");
        deleteLocalVisitRecords(user.id, ids);
        return { ids, action };
      }
      if (error) throw error;
      return { ids, action };
    },
    onSuccess: ({ ids, action }) => {
      setLastRecords([]);
      toast.success(
        action === "undo"
          ? `Last action undone (${ids.length} record${ids.length === 1 ? "" : "s"} removed)`
          : `${ids.length} visit record${ids.length === 1 ? "" : "s"} cleared`,
      );
      void queryClient.invalidateQueries({ queryKey: ["field-visit-units", user?.id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to clear records"),
    onSettled: () => setDeleteAction(null),
  });

  const addStarterUnitsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in required to add starter GP rows.");
      const rows = starterCoverageRows(user.id);
      const { error } = await fieldVisitDb().from("field_visit_units").upsert(rows, {
        onConflict: "owner_id,administrative_unit,block_name,gp_name",
      });
      if (error && isMissingFieldVisitSchemaError(error)) {
        upsertLocalFieldVisitUnits(user.id, rows);
        return rows.length;
      }
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      setAdministrativeUnit(ALL);
      setBlockFilter(ALL);
      setStatusFilter(ALL);
      setSearch("");
      toast.success(`${count} starter GP row${count === 1 ? "" : "s"} added`);
      void queryClient.invalidateQueries({ queryKey: ["field-visit-units", user?.id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to add starter GP rows"),
  });

  const replaceCsvMutation = useMutation({
    mutationFn: async (rows: UnitUpsertRow[]) => {
      if (!user?.id) throw new Error("Sign in required to replace GP coverage.");

      const importedKeys = new Set(rows.map(coverageRowKey));
      const staleUnitIds = units
        .filter((unit) => unit.owner_id === user.id && !importedKeys.has(coverageRowKey(unit)))
        .map((unit) => unit.id);

      const { error: upsertError } = await fieldVisitDb().from("field_visit_units").upsert(rows, {
        onConflict: "owner_id,administrative_unit,block_name,gp_name",
      });
      if (upsertError && isMissingFieldVisitSchemaError(upsertError)) {
        replaceLocalFieldVisitUnits(user.id, rows);
        return { imported: rows.length, removed: staleUnitIds.length };
      }
      if (upsertError) throw upsertError;

      if (staleUnitIds.length > 0) {
        const { error: deleteError } = await fieldVisitDb()
          .from("field_visit_units")
          .delete()
          .in("id", staleUnitIds);
        if (deleteError) throw deleteError;
      }

      return { imported: rows.length, removed: staleUnitIds.length };
    },
    onSuccess: ({ imported, removed }) => {
      toast.success(
        `${imported} GP coverage row${imported === 1 ? "" : "s"} replaced${
          removed ? `, ${removed} old row${removed === 1 ? "" : "s"} removed` : ""
        }`,
      );
      setCsvPreview(null);
      setAdministrativeUnit(ALL);
      setBlockFilter(ALL);
      setStatusFilter(ALL);
      setSearch("");
      setSelectedIds(new Set());
      setLastRecords([]);
      void queryClient.invalidateQueries({ queryKey: ["field-visit-units", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "CSV import failed"),
  });

  const createPlanMutation = useMutation({
    mutationFn: async ({
      title,
      planDate,
      unitIds,
      notes,
      time,
      duration,
      status = "draft",
    }: CreateDraftPlanInput) => {
      if (!user?.id) throw new Error("Sign in required to save field visit plans.");
      const planDateIso = inputDateToIso(planDate);
      if (!isValidInputDate(planDateIso)) throw new Error("Use a valid plan date.");
      const planNotes = buildPlanNotes({ notes, time, duration });
      const { data: plan, error: planError } = await fieldVisitDb()
        .from("field_visit_plans")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          plan_date: planDateIso,
          notes: planNotes,
          status,
        })
        .select("*")
        .single();
      if (planError && isMissingFieldVisitSchemaError(planError)) {
        return createLocalFieldVisitPlan(user.id, {
          owner_id: user.id,
          title: title.trim(),
          plan_date: planDateIso,
          notes: planNotes,
          status,
        }, unitIds, notes);
      }
      if (planError) throw planError;
      if (!plan?.id) throw new Error("Plan was not created.");
      const itemRows = unitIds.map((unitId, index) => ({
        plan_id: plan.id,
        unit_id: unitId,
        route_order: index + 1,
        message: notes?.trim() || null,
      }));
      if (itemRows.length > 0) {
        const { error: itemError } = await fieldVisitDb()
          .from("field_visit_plan_items")
          .insert(itemRows);
        if (itemError) throw itemError;
      }
      return plan;
    },
    onSuccess: (plan) => {
      toast.success(`Plan saved: ${plan.title}`);
      void queryClient.invalidateQueries({ queryKey: ["field-visit-plans", user?.id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to save draft plan"),
  });

  const updatePlanStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FieldVisitPlan["status"] }) => {
      const { error } = await fieldVisitDb().from("field_visit_plans").update({ status }).eq("id", id);
      if (error && isMissingFieldVisitSchemaError(error)) {
        if (!user?.id) throw new Error("Sign in required to update plans.");
        updateLocalFieldVisitPlan(user.id, id, { status });
        return { id, status };
      }
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ status }) => {
      toast.success(status === "completed" ? "Plan completed" : "Plan scheduled");
      void queryClient.invalidateQueries({ queryKey: ["field-visit-plans", user?.id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to update plan"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fieldVisitDb().from("field_visit_plans").delete().eq("id", id);
      if (error && isMissingFieldVisitSchemaError(error)) {
        if (!user?.id) throw new Error("Sign in required to delete plans.");
        deleteLocalFieldVisitPlan(user.id, id);
        return id;
      }
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success("Draft plan removed");
      void queryClient.invalidateQueries({ queryKey: ["field-visit-plans", user?.id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to remove draft plan"),
  });

  useEffect(() => {
    const validIds = new Set(units.map((unit) => unit.id));
    setSelectedIds((current) => new Set([...current].filter((id) => validIds.has(id))));
  }, [units]);

  const selectedCount = selectedIds.size;
  const loading = unitsQuery.isLoading || plansQuery.isLoading;
  const error = unitsQuery.error ?? plansQuery.error;

  const onCsvUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!user?.id) {
      toast.error("Sign in required to replace GP coverage.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (replaceCsvMutation.isPending) {
      toast.info("CSV import already in progress.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const preview = analyzeFieldVisitCsv(await file.text());
      if (preview.rows.length === 0) {
        toast.error(
          preview.issues.find((issue) => issue.severity === "error")?.message ??
            "CSV did not contain importable GP rows.",
        );
        return;
      }
      setCsvPreview({ ...preview, fileName: file.name });
    } catch (csvError) {
      toast.error(csvError instanceof Error ? csvError.message : "Unable to read CSV file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmCsvImport = () => {
    if (!csvPreview) return;
    if (!user?.id) {
      toast.error("Sign in required to replace GP coverage.");
      return;
    }
    if (replaceCsvMutation.isPending) {
      toast.info("CSV import already in progress.");
      return;
    }
    replaceCsvMutation.mutate(csvPreview.rows.map((row) => ({ ...row, owner_id: user.id })));
  };

  const openCsvPicker = () => {
    if (!user?.id) {
      toast.error("Sign in required to replace GP coverage.");
      return;
    }
    if (replaceCsvMutation.isPending) {
      toast.info("CSV import already in progress.");
      return;
    }
    fileInputRef.current?.click();
  };

  const submitVisitStatus = (status: "visited" | "legacy") => {
    if (markVisitMutation.isPending) {
      toast.info("Visit update already in progress.");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in required to mark field visits.");
      return;
    }
    if (selectedUnits.length === 0) {
      toast.error("Select at least one GP.");
      return;
    }
    void form.handleSubmit(
      (values) => {
        setMarkingStatus(status);
        markVisitMutation.mutate({ status, values, units: selectedUnits });
      },
      (errors) => {
        toast.error(errors.visitedOn?.message ?? "Check visit date and notes.");
      },
    )();
  };
  const [notepadLocation, setNotepadLocation] = useState("Collectorate, Dantewada");
  const [notepadText, setNotepadText] = useState(defaultVisitNotes);
  const [savedNotes, setSavedNotes] = useState(defaultSavedNotes);
  const [suggestDate, setSuggestDate] = useState("19-08-2026");
  const [suggestDays, setSuggestDays] = useState("4");
  const [suggestions, setSuggestions] = useState<Array<{ day: number; unit: CoverageUnit }>>([]);
  const visibleSavedNotes = useMemo(() => {
    const rows = parseVisitNotepadNotes(notepadText, notepadLocation);
    return rows.length ? rows : savedNotes;
  }, [notepadLocation, notepadText, savedNotes]);

  useEffect(() => {
    if (!user?.id) return;
    const saved = readVisitNotepad(user.id);
    if (!saved) return;
    setNotepadLocation(saved.location);
    setNotepadText(saved.text);
    setSavedNotes(saved.savedNotes);
  }, [user?.id]);

  const recordVisit = async (visit: ProposedVisitRow, status: "visited" | "legacy") => {
    if (!user?.id) {
      toast.error("Sign in required to schedule field visits.");
      return;
    }
    const targets = units.filter((unit) => visit.unitIds.includes(unit.id));
    if (targets.length === 0) {
      toast.error("No GP rows available for this draft visit.");
      return;
    }
    try {
      const payload = targets.map((unit) => ({
        unit_id: unit.id,
        visited_on: visit.date,
        status,
        notes: visit.notes?.trim() || notepadText.trim() || null,
        recorded_by: user.id,
      }));
      const { data, error: insertError } = await fieldVisitDb()
        .from("field_visit_records")
        .insert(payload)
        .select("*");
      if (insertError && isMissingFieldVisitSchemaError(insertError)) {
        const records = saveLocalVisitRecords(user.id, payload);
        setLastRecords(records);
        setSelectedIds(new Set());
        if (visit.isSaved) {
          updatePlanStatusMutation.mutate({ id: visit.id, status: "completed" });
        }
        toast.success(`${targets.length} visit record${targets.length === 1 ? "" : "s"} saved`);
        void queryClient.invalidateQueries({ queryKey: ["field-visit-units", user?.id] });
        return;
      }
      if (insertError) throw insertError;
      setLastRecords(data ?? []);
      setSelectedIds(new Set());
      if (visit.isSaved) {
        updatePlanStatusMutation.mutate({ id: visit.id, status: "completed" });
      }
      toast.success(`${targets.length} visit record${targets.length === 1 ? "" : "s"} saved`);
      void queryClient.invalidateQueries({ queryKey: ["field-visit-units", user?.id] });
    } catch (insertError) {
      toast.error(insertError instanceof Error ? insertError.message : "Visit update failed");
    }
  };

  return (
    <div className="space-y-4 bg-[#F8FAFC] font-sans text-[#172033]">
      {loading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Loading coverage</AlertTitle>
          <AlertDescription>
            Fetching GP coverage, plans, and recent visit records.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Field visit data unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unable to load data."}
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-[#172033]">Field Visits</h2>
            <p className="mt-1 max-w-2xl text-xs text-[#64748B]">
              Plan by route, schedule directly, and push concise messages to selected staff + sleno copy.
            </p>
          </div>
          <Button asChild className="h-8 w-full rounded-md bg-[#4F46E5] text-xs sm:w-auto">
            <Link to="/planner">
              <CalendarClock className="h-3.5 w-3.5" />
              Open Weekly Planner
            </Link>
          </Button>
        </div>

        <CoverageControlCard
          administrativeUnit={administrativeUnit}
          administrativeUnits={administrativeUnits}
          blockCount={blocks.length}
          metrics={metrics}
          onAdministrativeUnitChange={setAdministrativeUnit}
          onAddStarterData={() => addStarterUnitsMutation.mutate()}
          onDownloadTemplate={downloadCoverageTemplate}
          onReplaceCsv={openCsvPicker}
          addingStarterData={addStarterUnitsMutation.isPending}
          replacingCsv={replaceCsvMutation.isPending}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void onCsvUpload(event.target.files?.[0])}
        />
        <CsvImportPreviewDialog
          preview={csvPreview}
          replacing={replaceCsvMutation.isPending}
          impact={csvPreview ? csvImportImpact(csvPreview, units, user?.id) : null}
          onConfirm={confirmCsvImport}
          onOpenChange={(open) => {
            if (!open && !replaceCsvMutation.isPending) setCsvPreview(null);
          }}
        />

        <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <section className="space-y-3">
            <CoverageJourney metrics={metrics} />
            <CoverageMap
              units={filteredUnits}
              search={search}
              selectedIds={selectedIds}
              showGpName={showGpName}
              onSearchChange={setSearch}
              onShowGpNameChange={setShowGpName}
              onToggleUnit={(id) =>
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />
            <BlockCoverageTiles blockSummaries={blockSummaries} />
            <AttentionWinsPanels blockSummaries={blockSummaries} recentWins={recentWins} />
          </section>

          <MarkVisitsPanel
            attentionUnits={attentionUnits}
            blockFilter={blockFilter}
            blocks={blocks}
            filteredUnits={filteredUnits}
            form={form}
            clearing={deleteAction === "clear" && deleteRecordsMutation.isPending}
            deleteBusy={deleteRecordsMutation.isPending}
            markingStatus={markingStatus}
            marking={markVisitMutation.isPending}
            pendingVisible={pendingVisible}
            addingStarterData={addStarterUnitsMutation.isPending}
            selectedRecordCount={selectedRecordIds.length}
            search={search}
            selectedIds={selectedIds}
            selectedCount={selectedCount}
            statusFilter={statusFilter}
            onBlockFilterChange={setBlockFilter}
            onAddStarterData={() => addStarterUnitsMutation.mutate()}
            onClearRecords={() => {
              if (!selectedRecordIds.length) {
                toast.info("No visit records found for selected GPs.");
                return;
              }
              setDeleteAction("clear");
              deleteRecordsMutation.mutate({ ids: selectedRecordIds, action: "clear" });
            }}
            onClearSelection={() => setSelectedIds(new Set())}
            onSearchChange={setSearch}
            onSelectIds={(ids) => setSelectedIds(new Set(ids))}
            onStatusFilterChange={(value) => setStatusFilter(value as VisitStatus | typeof ALL)}
            onSubmitLegacy={() => submitVisitStatus("legacy")}
            onSubmitVisited={() => submitVisitStatus("visited")}
            onToggleUnit={(id) =>
              setSelectedIds((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onUndo={() => {
              const ids = lastRecords
                .map((record) => record.id)
                .filter((id) => !id.startsWith("optimistic-"));
              if (!ids.length) return;
              setDeleteAction("undo");
              deleteRecordsMutation.mutate({ ids, action: "undo" });
            }}
            undoDisabled={lastRecords.length === 0 || deleteRecordsMutation.isPending}
            undoing={deleteAction === "undo" && deleteRecordsMutation.isPending}
          />
        </div>

      </section>

      <ProposedFieldVisitExperience
        visits={proposedVisits}
        creatingPlan={createPlanMutation.isPending}
        deletingPlanId={deletePlanMutation.variables ?? null}
        notepadLocation={notepadLocation}
        notepadText={notepadText}
        savedNotes={visibleSavedNotes}
        schedulingPlanId={updatePlanStatusMutation.variables?.id ?? null}
        suggestDate={suggestDate}
        suggestDays={suggestDays}
        suggestions={suggestions}
        onCreateDraft={(draft) => {
          const unitIds = selectedIds.size
            ? [...selectedIds]
            : attentionUnits.slice(0, 3).map((unit) => unit.id);
          createPlanMutation.mutate({ ...draft, unitIds });
        }}
        onDone={(visit) => void recordVisit(visit, "visited")}
        onMap={(visit) => setSelectedIds(new Set(visit.unitIds))}
        onNotepadLocationChange={setNotepadLocation}
        onNotepadTextChange={setNotepadText}
        onSaveNotes={() => {
          const rows = parseVisitNotepadNotes(notepadText, notepadLocation);
          const nextNotes = rows.length ? rows : defaultSavedNotes;
          setSavedNotes(nextNotes);
          if (user?.id) {
            saveVisitNotepad(user.id, {
              location: notepadLocation,
              text: notepadText,
              savedNotes: nextNotes,
            });
          }
          toast.success("Visit planning notepad saved");
        }}
        onSchedule={(visit) => {
          if (visit.isSaved) {
            updatePlanStatusMutation.mutate({ id: visit.id, status: "scheduled" });
            return;
          }
          createPlanMutation.mutate({
            title: visit.title,
            planDate: visit.date,
            unitIds: visit.unitIds,
            notes: visit.notes,
            time: visit.time,
            duration: visit.duration,
            status: "scheduled",
          });
        }}
        onScheduleNote={(note) => {
          const title = note.title.replace(/^\d+\.\s*/, "");
          const unitIds = unitsForSavedNote(note, units, attentionUnits);
          if (unitIds.length === 0) {
            toast.error("No GP rows available to schedule this note.");
            return;
          }
          createPlanMutation.mutate({
            title,
            planDate: suggestDate,
            unitIds,
            notes: `${note.meta}\n${note.title}`,
            time: "10:00",
            duration: "60 min",
            status: "scheduled",
          });
          toast.success("Notepad item selected for scheduling");
        }}
        onSuggestDateChange={setSuggestDate}
        onSuggestDaysChange={setSuggestDays}
        onSuggestRoute={() => {
          const count = Math.max(1, Number(suggestDays) || 1);
          const rows = attentionUnits
            .slice(0, count)
            .map((unit, index) => ({ day: index + 1, unit }));
          setSuggestions(rows);
          rows.forEach(({ day, unit }) => {
            createPlanMutation.mutate({
              title: `Day ${day}: ${unit.block_name} field route`,
              planDate: addDaysToInputDate(suggestDate, day - 1),
              unitIds: [unit.id],
              notes: `${unit.gp_name} - priority ${unit.priority_score}`,
            });
          });
          toast.success("Route suggestions generated");
        }}
        onTrash={(visit) => {
          if (visit.isSaved) deletePlanMutation.mutate(visit.id);
          else {
            setDismissedFallbackVisitIds((current) => {
              const next = new Set(current).add(visit.id);
              saveDismissedFallbackVisitIds(next);
              return next;
            });
            toast.success("Auto draft removed");
          }
        }}
      />
    </div>
  );
}

type ProposedVisitRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  status: FieldVisitPlan["status"];
  unitIds: string[];
  notes: string | null;
  isSaved: boolean;
};

type SavedNoteRow = {
  id: string;
  title: string;
  meta: string;
};

type VisitNotepadState = {
  location: string;
  text: string;
  savedNotes: SavedNoteRow[];
};

const defaultVisitNotes = [
  "Dantewada - GP coverage review",
  "Geedam - Anganwadi and school visit",
  "Katekalyan - PHC and field inspection",
  "Kuwakonda - road and panchayat works",
  "Barsur - community asset verification",
  "Nakulnar - PMGSY road inspection with team",
  "Visit panchayat training institutions",
].join("\n");

const defaultSavedNotes: SavedNoteRow[] = [
  { id: "note-1", title: "1. Dantewada - GP coverage review", meta: "Dantewada" },
  { id: "note-2", title: "2. Geedam - Anganwadi and school visit", meta: "Geedam" },
  { id: "note-3", title: "3. Katekalyan - PHC and field inspection", meta: "Katekalyan" },
];

function visitNotepadStorageKey(ownerId: string) {
  return `${FIELD_VISIT_NOTEPAD_STORAGE_PREFIX}:${ownerId}`;
}

function readVisitNotepad(ownerId: string): VisitNotepadState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(visitNotepadStorageKey(ownerId));
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<VisitNotepadState>;
    return {
      location: typeof parsed.location === "string" ? parsed.location : "Collectorate, Dantewada",
      text: typeof parsed.text === "string" ? parsed.text : defaultVisitNotes,
      savedNotes: Array.isArray(parsed.savedNotes) ? parsed.savedNotes : defaultSavedNotes,
    };
  } catch {
    return null;
  }
}

function saveVisitNotepad(ownerId: string, state: VisitNotepadState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(visitNotepadStorageKey(ownerId), JSON.stringify(state));
}

function parseVisitNotepadNotes(text: string, fallbackLocation: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [location, priority, item] = line.split("|").map((part) => part.trim());
      const meta = location || line.split("-")[0]?.trim() || fallbackLocation;
      const label = item || priority || line;
      return {
        id: `note-${index + 1}-${meta.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: `${index + 1}. ${label}`,
        meta,
      };
    });
}

function unitsForSavedNote(
  note: SavedNoteRow,
  units: CoverageUnit[],
  attentionUnits: CoverageUnit[],
) {
  const haystack = `${note.meta} ${note.title}`.toLowerCase();
  const matched = units.filter((unit) => {
    const gp = unit.gp_name.toLowerCase();
    const block = unit.block_name.toLowerCase();
    return haystack.includes(gp) || haystack.includes(block);
  });
  const fallback = attentionUnits.length ? attentionUnits : units;
  return (matched.length ? matched : fallback).slice(0, 3).map((unit) => unit.id);
}

function CsvImportPreviewDialog({
  preview,
  replacing,
  impact,
  onConfirm,
  onOpenChange,
}: {
  preview: CsvImportPreview | null;
  replacing: boolean;
  impact: CsvImportImpact | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const issues = preview?.issues ?? [];
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const canImport = !!preview && preview.rows.length > 0;

  return (
    <Dialog open={!!preview} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review GP CSV Import</DialogTitle>
          <DialogDescription>
            Confirm before replacing current GP coverage rows.
          </DialogDescription>
        </DialogHeader>

        {preview && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <CsvPreviewStat label="File" value={preview.fileName} />
              <CsvPreviewStat label="CSV rows" value={String(preview.totalRows)} />
              <CsvPreviewStat label="Will import" value={String(preview.rows.length)} />
              <CsvPreviewStat label="Skipped rows" value={String(impact?.skipped ?? 0)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <CsvPreviewStat label="New rows" value={String(impact?.added ?? 0)} />
              <CsvPreviewStat label="Updated rows" value={String(impact?.updated ?? 0)} />
              <CsvPreviewStat label="Will remove" value={String(impact?.removed ?? 0)} />
            </div>

            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Replace action</AlertTitle>
              <AlertDescription>
                Confirming will import the valid preview rows and remove old rows that are not present in this CSV.
              </AlertDescription>
            </Alert>

            {(errors.length > 0 || warnings.length > 0) && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={errors.length ? "destructive" : "outline"}>
                    {errors.length} skipped row error{errors.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {warnings.length} warning{warnings.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">{preview.duplicateRows} duplicate skipped</Badge>
                </div>
                <div className="mt-3 max-h-36 space-y-1 overflow-y-auto">
                  {issues.slice(0, 8).map((issue, index) => (
                    <p
                      key={`${issue.row}-${index}`}
                      className={cn(
                        "text-xs",
                        issue.severity === "error" ? "text-destructive" : "text-amber-700",
                      )}
                    >
                      Row {issue.row}: {issue.message}
                    </p>
                  ))}
                  {issues.length > 8 && (
                    <p className="text-xs text-muted-foreground">
                      {issues.length - 8} more issue{issues.length - 8 === 1 ? "" : "s"} hidden.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1.1fr_1fr_1fr_80px] bg-muted/50 px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">
                <span>GP</span>
                <span>Block</span>
                <span>Admin Unit</span>
                <span>Priority</span>
              </div>
              <div className="max-h-44 overflow-y-auto">
                {preview.rows.slice(0, 8).map((row) => (
                  <div
                    key={`${row.administrative_unit}-${row.block_name}-${row.gp_name}`}
                    className="grid grid-cols-[1.1fr_1fr_1fr_80px] border-t px-3 py-2 text-xs"
                  >
                    <span className="truncate font-semibold">{row.gp_name}</span>
                    <span className="truncate text-muted-foreground">{row.block_name}</span>
                    <span className="truncate text-muted-foreground">{row.administrative_unit}</span>
                    <span>{row.priority_score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={replacing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={!canImport || replacing}
          >
            {replacing && <Loader2 className="h-4 w-4 animate-spin" />}
            Replace GP Coverage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CsvPreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#172033]">{value}</p>
    </div>
  );
}

function ProposedFieldVisitExperience({
  visits,
  creatingPlan,
  deletingPlanId,
  notepadLocation,
  notepadText,
  savedNotes,
  schedulingPlanId,
  suggestDate,
  suggestDays,
  suggestions,
  onCreateDraft,
  onDone,
  onMap,
  onNotepadLocationChange,
  onNotepadTextChange,
  onSaveNotes,
  onSchedule,
  onScheduleNote,
  onSuggestDateChange,
  onSuggestDaysChange,
  onSuggestRoute,
  onTrash,
}: {
  visits: ProposedVisitRow[];
  creatingPlan: boolean;
  deletingPlanId: string | null;
  notepadLocation: string;
  notepadText: string;
  savedNotes: SavedNoteRow[];
  schedulingPlanId: string | null;
  suggestDate: string;
  suggestDays: string;
  suggestions: Array<{ day: number; unit: CoverageUnit }>;
  onCreateDraft: (draft: Omit<CreateDraftPlanInput, "unitIds">) => void;
  onDone: (visit: ProposedVisitRow) => void;
  onMap: (visit: ProposedVisitRow) => void;
  onNotepadLocationChange: (value: string) => void;
  onNotepadTextChange: (value: string) => void;
  onSaveNotes: () => void;
  onSchedule: (visit: ProposedVisitRow) => void;
  onScheduleNote: (note: SavedNoteRow) => void;
  onSuggestDateChange: (value: string) => void;
  onSuggestDaysChange: (value: string) => void;
  onSuggestRoute: () => void;
  onTrash: (visit: ProposedVisitRow) => void;
}) {
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden rounded-xl border-[#E5E7EB] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <CardHeader className="border-b border-[#E5E7EB] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-[13px] font-bold leading-none text-[#172033]">
              Proposed Field Visit List ({visits.length})
            </CardTitle>
            <p className="text-right text-[7px] font-medium text-[#64748B]">
              Saved plans, schedule status, and route suggestions stay synced here.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visits.length === 0 ? (
            <p className="px-3 py-8 text-center text-[10px] font-medium text-[#64748B]">
              No proposed field visits.
            </p>
          ) : (
            visits.map((visit) => (
            <div key={visit.id} className="border-b border-[#E5E7EB] last:border-b-0">
              <div className="grid gap-2 px-3 py-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-[12px] font-bold leading-tight text-[#172033]">
                      {visit.title}
                    </h3>
                    <span className="rounded-full bg-[#F1EAFE] px-1.5 py-0.5 text-[7px] font-bold capitalize leading-none text-[#6D28D9]">
                      {visit.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[8px] font-medium leading-none text-[#64748B]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      {formatDisplayDate(visit.date)}
                    </span>
                    <span>{visit.time}</span>
                    <span>{visit.duration}</span>
                    <span>{visit.unitIds.length} GP</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                  <Button
                    type="button"
                    className="h-7 rounded-md bg-[#059669] px-2.5 text-[8px] font-bold text-white hover:bg-[#047857]"
                    onClick={() => onSchedule(visit)}
                    disabled={schedulingPlanId === visit.id || creatingPlan}
                  >
                    {schedulingPlanId === visit.id ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <CalendarClock className="h-2.5 w-2.5" />
                    )}
                    {visit.status === "scheduled" ? "Scheduled" : "Schedule"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 rounded-md border-[#DDE3EA] bg-white px-2.5 text-[8px] font-bold text-[#172033]"
                    onClick={() => onDone(visit)}
                    disabled={visit.unitIds.length === 0}
                  >
                    Done
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 rounded-md border-[#DDE3EA] bg-white px-2.5 text-[8px] font-bold text-[#172033]"
                    onClick={() => onMap(visit)}
                    disabled={visit.unitIds.length === 0}
                  >
                    <MapPin className="h-2.5 w-2.5" />
                    Map
                  </Button>
                  <TinyIconButton
                    label="Delete"
                    className="border-[#FAD7DD] bg-[#FFF7F8] text-[#EF4444]"
                    onClick={() => onTrash(visit)}
                    disabled={deletingPlanId === visit.id}
                  >
                    {deletingPlanId === visit.id ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-2.5 w-2.5" />
                    )}
                  </TinyIconButton>
                </div>
              </div>
            </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="min-h-[265px] rounded-xl border-[#DADFFC] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <CardHeader className="px-3 pb-1.5 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-[11px] font-bold text-[#172033]">
              <ClipboardCheck className="h-3 w-3 text-[#4F46E5]" />
              Visit Planning Notepad
            </CardTitle>
            <p className="text-[7px] leading-tight text-[#64748B]">
              Please record permanent GP/high-priority projects (one line each). Use: Location | priority | item | Notes
            </p>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="grid gap-1.5 sm:grid-cols-[1fr_1fr]">
              <Input
                value={notepadLocation}
                onChange={(event) => onNotepadLocationChange(event.target.value)}
                className="h-7 rounded-md border-[#DDE3EA] text-[8px]"
              />
              <Button
                type="button"
                className="h-7 rounded-md bg-[#4F46E5] text-[8px] font-bold hover:bg-[#4338CA]"
                onClick={onSaveNotes}
              >
                <Save className="h-2.5 w-2.5" />
                Save Notepad
              </Button>
            </div>
            <Textarea
              value={notepadText}
              onChange={(event) => onNotepadTextChange(event.target.value)}
              className="h-[96px] resize-none rounded-md border-[#DDE3EA] bg-white text-[9px] leading-[1.35] text-[#172033]"
            />
            <div className="space-y-1">
              {savedNotes.map((note) => (
                <div
                  key={note.id}
                  className="grid min-h-9 gap-2 rounded-md border border-[#E5E7EB] bg-white px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[8px] font-bold leading-tight text-[#172033]">
                      {note.title}
                    </p>
                    <p className="truncate text-[7px] leading-tight text-[#64748B]">{note.meta}</p>
                  </div>
                  <Button
                    type="button"
                    className="h-6 rounded-md bg-[#059669] px-2 text-[7px] font-bold hover:bg-[#047857]"
                    onClick={() => onScheduleNote(note)}
                    disabled={creatingPlan}
                  >
                    {creatingPlan ? "Saving" : "Schedule"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[265px] rounded-xl border-[#CDEBDD] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <CardHeader className="px-3 pb-1.5 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-[11px] font-bold text-[#172033]">
              <Sparkles className="h-3 w-3 text-[#059669]" />
              Route-wise Day Suggestions
            </CardTitle>
            <p className="text-[7px] leading-tight text-[#64748B]">
              Smarter clustering by route and priority • prioritize from drafts and notepad.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(120px,1fr)_78px] xl:grid-cols-[minmax(128px,1fr)_72px_minmax(132px,150px)]">
              <Input
                value={suggestDate}
                onChange={(event) => onSuggestDateChange(event.target.value)}
                className="h-8 min-w-0 rounded-md border-[#DDE3EA] px-2 text-[10px]"
                aria-label="Suggestion start date"
              />
              <Input
                value={suggestDays}
                onChange={(event) => onSuggestDaysChange(event.target.value)}
                className="h-8 min-w-0 rounded-md border-[#DDE3EA] px-2 text-center text-[10px]"
                aria-label="Suggestion days"
              />
              <Button
                type="button"
                className="h-8 min-w-0 rounded-md bg-[#059669] px-2 text-[9px] font-bold hover:bg-[#047857] sm:col-span-2 xl:col-span-1"
                onClick={onSuggestRoute}
              >
                <RouteIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">Suggest Route</span>
              </Button>
            </div>
            {suggestions.length === 0 ? (
              <p className="rounded-md border border-dashed border-emerald-100 px-2 py-3 text-[9px] italic text-[#64748B]">
                No suggestions generated yet.
              </p>
            ) : (
              <div className="max-h-[148px] space-y-1 overflow-y-auto pr-1 pt-1">
                {suggestions.map((suggestion) => (
                  <div
                    key={`${suggestion.day}-${suggestion.unit.id}`}
                    className="rounded-md border border-[#E5E7EB] px-2 py-1.5"
                  >
                    <p className="text-[8px] font-bold text-[#172033]">
                      Day {suggestion.day}: {suggestion.unit.block_name}
                    </p>
                    <p className="text-[7px] text-[#64748B]">{suggestion.unit.gp_name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddDraftVisitItemCard creating={creatingPlan} onCreateDraft={onCreateDraft} />
    </div>
  );
}

function TinyIconButton({
  label,
  className,
  children,
  disabled,
  onClick,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      className={cn("h-7 w-7 rounded-md border-[#DDE3EA] bg-white text-[#94A3B8]", className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function AddDraftVisitItemCard({
  creating,
  onCreateDraft,
}: {
  creating: boolean;
  onCreateDraft: (draft: Omit<CreateDraftPlanInput, "unitIds">) => void;
}) {
  const [visitName, setVisitName] = useState("");
  const [visitDate, setVisitDate] = useState("19-08-2026");
  const [visitTime, setVisitTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("120");
  const [department, setDepartment] = useState("none");
  const [people, setPeople] = useState("");
  const [places, setPlaces] = useState("");
  const canSave = visitName.trim().length > 0 && visitDate.trim().length > 0;

  const saveDraft = () => {
    if (!canSave) {
      toast.error("Visit name and date are required.");
      return;
    }
    onCreateDraft({
      title: visitName,
      planDate: visitDate,
      time: visitTime,
      duration: `${duration} min`,
      notes: [
        department !== "none" ? `Department: ${department}` : "",
        people.trim() ? `People: ${people.trim()}` : "",
        places.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    });
    setVisitName("");
    setPlaces("");
  };

  return (
    <Card className="min-h-[180px] rounded-xl border-[#D9E2F0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <CardHeader className="px-3 pb-2 pt-3">
        <CardTitle className="flex items-center gap-1.5 text-[11px] font-bold leading-none text-[#172033]">
          <Plus className="h-3 w-3 text-[#4F46E5]" />
          Add Draft Visit Item
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            value={visitName}
            onChange={(event) => setVisitName(event.target.value)}
            placeholder="Visit name"
            className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[9px] text-[#172033] placeholder:text-[#94A3B8]"
          />
          <div className="relative">
            <Input
              value={visitDate}
              onChange={(event) => setVisitDate(event.target.value)}
              className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 pr-7 text-[9px] text-[#172033] placeholder:text-[#94A3B8]"
            />
            <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#172033]" />
          </div>
          <div className="relative">
            <Input
              value={visitTime}
              onChange={(event) => setVisitTime(event.target.value)}
              className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 pr-7 text-[9px] text-[#172033] placeholder:text-[#94A3B8]"
            />
            <Clock3 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#172033]" />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <Input
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[9px] text-[#172033] placeholder:text-[#94A3B8]"
          />
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[9px] text-[#172033]">
              <SelectValue placeholder="No specific department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific department</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={people}
            onChange={(event) => setPeople(event.target.value)}
            placeholder="People who will go along"
            className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[9px] text-[#172033] placeholder:text-[#94A3B8]"
          />
        </div>

        <Textarea
          value={places}
          onChange={(event) => setPlaces(event.target.value)}
          placeholder="Visit places notepad"
          className="h-[50px] min-h-[50px] resize-none rounded-md border-[#D9E2F0] bg-white px-2 py-2 text-[9px] leading-tight text-[#172033] placeholder:text-[#94A3B8]"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            className="h-8 rounded-md bg-[#4F46E5] px-3 text-[9px] font-bold hover:bg-[#4338CA]"
            onClick={saveDraft}
            disabled={creating || !canSave}
          >
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Save Draft
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function planToProposedVisit(
  plan: FieldVisitPlanWithItems,
  unitById: Map<string, CoverageUnit>,
): ProposedVisitRow {
  const meta = parsePlanNotes(plan.notes);
  const itemIds = [...(plan.field_visit_plan_items ?? [])]
    .sort((a, b) => a.route_order - b.route_order)
    .map((item) => item.unit_id)
    .filter((id) => unitById.has(id));

  return {
    id: plan.id,
    title: plan.title,
    date: plan.plan_date,
    time: meta.time || "10:00",
    duration: meta.duration || "60 min",
    status: plan.status,
    unitIds: itemIds,
    notes: meta.notes || plan.notes,
    isSaved: true,
  };
}

function buildPlanNotes({
  notes,
  time,
  duration,
}: Pick<CreateDraftPlanInput, "notes" | "time" | "duration">) {
  return JSON.stringify({
    time: time?.trim() || "",
    duration: duration?.trim() || "",
    notes: notes?.trim() || "",
  });
}

function parsePlanNotes(value: string | null) {
  if (!value) return { time: "", duration: "", notes: "" };
  try {
    const parsed = JSON.parse(value) as Partial<Record<"time" | "duration" | "notes", string>>;
    return {
      time: parsed.time ?? "",
      duration: parsed.duration ?? "",
      notes: parsed.notes ?? "",
    };
  } catch {
    return { time: "", duration: "", notes: value };
  }
}

function formatDisplayDate(value: string) {
  try {
    return format(parseISO(inputDateToIso(value)), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

function addDaysToInputDate(value: string, days: number) {
  const date = parseISO(inputDateToIso(value));
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

function inputDateToIso(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return value;
}

function isValidInputDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function CoverageControlCard({
  administrativeUnit,
  administrativeUnits,
  blockCount,
  metrics,
  addingStarterData,
  replacingCsv,
  onAdministrativeUnitChange,
  onAddStarterData,
  onDownloadTemplate,
  onReplaceCsv,
}: {
  administrativeUnit: string;
  administrativeUnits: string[];
  blockCount: number;
  metrics: ReturnType<typeof coverageMetrics>;
  addingStarterData: boolean;
  replacingCsv: boolean;
  onAdministrativeUnitChange: (value: string) => void;
  onAddStarterData: () => void;
  onDownloadTemplate: () => void;
  onReplaceCsv: () => void;
}) {
  const selectedUnitLabel = administrativeUnit === ALL ? "Dantewada" : administrativeUnit;

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <div className="grid gap-3 rounded-lg border border-emerald-100 bg-white/70 p-3 shadow-card xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,2.2fr)] xl:items-center">
          <div className="min-w-0 xl:self-center">
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600">
                <ClipboardCheck className="h-3 w-3" />
              </span>
              <h3 className="truncate text-[11px] font-bold leading-none text-[#172033]">
                GP Visit Coverage
              </h3>
            </div>
            <p className="mt-1 truncate text-[8px] font-medium text-[#64748B]">
              {selectedUnitLabel} | {metrics.total} Gram Panchayats across {blockCount} blocks.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-end">
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(130px,150px)_minmax(132px,150px)_minmax(146px,164px)_minmax(132px,156px)] xl:flex-1">
            <Select value={administrativeUnit} onValueChange={onAdministrativeUnitChange}>
              <SelectTrigger className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[10px] font-semibold">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Dantewada</SelectItem>
                {administrativeUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[10px] font-semibold"
              onClick={onAddStarterData}
              disabled={addingStarterData || replacingCsv}
              aria-busy={addingStarterData}
            >
              {addingStarterData ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {addingStarterData ? "Adding" : "Add sample GPs"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-[#D9E2F0] bg-white px-2 text-[10px] font-semibold"
              onClick={onDownloadTemplate}
            >
              <Download className="h-3 w-3" />
              Download format
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
              onClick={onReplaceCsv}
              disabled={replacingCsv}
              aria-busy={replacingCsv}
            >
              {replacingCsv ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileUp className="h-3 w-3" />
              )}
              {replacingCsv ? "Importing CSV" : "Replace GP CSV"}
            </Button>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5 xl:w-[500px] xl:shrink-0">
            <MetricCard
              label="Coverage"
              value={`${metrics.coverage}%`}
              tone="primary"
            />
            <MetricCard label="Visited" value={metrics.visited} tone="success" />
            <MetricCard
              label="Action Needed"
              value={metrics.actionNeeded}
              tone="destructive"
            />
            <MetricCard label="Legacy" value={metrics.legacy} tone="info" />
            <MetricCard
              label="90+ Days"
              value={metrics.pending90}
              tone="warning"
            />
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "primary" | "success" | "destructive" | "warning" | "info";
}) {
  const tones = {
    primary: "border-[#D6E4FF] bg-white text-[#172033]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    destructive: "border-rose-200 bg-rose-50 text-rose-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-cyan-200 bg-cyan-50 text-cyan-800",
  };
  return (
    <div className={cn("min-h-[48px] rounded-lg border px-3 py-2 shadow-card", tones[tone])}>
      <p className="truncate text-[8px] font-extrabold uppercase leading-none tracking-wide">
        {label}
      </p>
      <p className="mt-1.5 text-base font-extrabold leading-none tabular-nums">{value}</p>
    </div>
  );
}

function CoverageJourney({ metrics }: { metrics: ReturnType<typeof coverageMetrics> }) {
  return (
    <Card className="rounded-lg shadow-card">
      <CardContent className="p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(310px,390px)] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#172033]">Coverage Journey</p>
              <p className="text-xs font-bold text-primary tabular-nums">{metrics.coverage}%</p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#DDD2F5]">
              <div
                className="h-full rounded-full bg-[#A78BFA]"
                style={{ width: `${metrics.coverage}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <JourneyStat label="Recent Visits" value={metrics.recentVisits} />
            <JourneyStat label="Never Visited" value={metrics.neverVisited} />
            <JourneyStat label="District Readiness" value={`${metrics.readiness}%`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JourneyStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-h-[48px] rounded-lg border bg-white px-3 py-2 shadow-card">
      <p className="truncate text-[8px] font-extrabold uppercase leading-none tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 text-base font-extrabold leading-none text-[#172033] tabular-nums">
        {value}
      </p>
    </div>
  );
}

function CoverageMap({
  units,
  search,
  selectedIds,
  showGpName,
  onSearchChange,
  onShowGpNameChange,
  onToggleUnit,
}: {
  units: CoverageUnit[];
  search: string;
  selectedIds: Set<string>;
  showGpName: boolean;
  onSearchChange: (value: string) => void;
  onShowGpNameChange: (value: boolean) => void;
  onToggleUnit: (id: string) => void;
}) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<unknown[]>([]);
  const locatedUnits = useMemo(
    () => units.filter((unit) => unit.latitude !== null && unit.longitude !== null),
    [units],
  );

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !mapNodeRef.current || mapRef.current) return;
      mapRef.current = L.map(mapNodeRef.current, { zoomControl: true }).setView([18.9, 81.35], 9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapRef.current);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    void import("leaflet").then((L) => {
      for (const marker of markersRef.current) {
        (marker as { remove: () => void }).remove();
      }
      markersRef.current = [];
      const bounds: LatLngBoundsExpression = [];
      for (const unit of locatedUnits) {
        const latLng: [number, number] = [Number(unit.latitude), Number(unit.longitude)];
        const selected = selectedIds.has(unit.id);
        (bounds as [number, number][]).push(latLng);
        const marker = L.circleMarker(latLng, {
          radius: selected ? 7 : 5,
          color: selected ? "#2563eb" : markerColor(unit.status),
          fillColor: markerColor(unit.status),
          fillOpacity: selected ? 1 : 0.88,
          weight: selected ? 4 : 2,
        }).addTo(mapRef.current!);
        marker.on("click", () => onToggleUnit(unit.id));
        marker.bindTooltip(
          showGpName ? unit.gp_name : `${unit.gp_name} - ${statusLabel(unit.status)}`,
          {
            permanent: showGpName,
            direction: "top",
            className: "field-visit-map-label",
          },
        );
        marker.bindPopup(`
          <strong>${escapeHtml(unit.gp_name)}</strong><br/>
          Block: ${escapeHtml(unit.block_name)}<br/>
          Status: ${statusLabel(unit.status)}<br/>
          Last visit: ${unit.lastVisit ? escapeHtml(unit.lastVisit.visited_on) : "Never"}
        `);
        markersRef.current.push(marker);
      }
      if (locatedUnits.length > 0)
        mapRef.current!.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
    });
  }, [locatedUnits, onToggleUnit, selectedIds, showGpName]);

  return (
    <Card className="overflow-hidden rounded-lg shadow-card">
      <CardHeader className="border-b px-3 py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-sm">Interactive Coverage Map</CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Green visited, red pending, orange legacy coverage. Click a marker to select GP.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-8 rounded-md pl-8 text-[10px]"
                placeholder="Search GP"
              />
            </div>
            <label className="flex h-8 items-center gap-2 rounded-md border bg-white px-3 text-[10px] font-semibold">
              <Switch checked={showGpName} onCheckedChange={onShowGpNameChange} className="scale-75" />
              Show GP Name
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div ref={mapNodeRef} className="h-[340px] w-full bg-muted md:h-[390px]" />
          {locatedUnits.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/82 p-6 text-center backdrop-blur-sm">
              <div>
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No mapped GP coordinates available.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload latitude and longitude in the GP CSV.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BlockCoverageTiles({
  blockSummaries,
}: {
  blockSummaries: ReturnType<typeof buildBlockSummaries>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {blockSummaries.slice(0, 4).map((block) => (
        <div key={block.block} className="rounded-lg border bg-white px-3 py-2 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[11px] font-bold text-[#172033]">{block.block}</p>
            <p className="shrink-0 text-[10px] font-extrabold text-emerald-700">{block.coverage}%</p>
          </div>
          <p className="mt-1 text-[9px] font-medium text-[#64748B]">
            {block.visited}/{block.total} visited
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${block.coverage}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AttentionWinsPanels({
  blockSummaries,
  recentWins,
}: {
  blockSummaries: ReturnType<typeof buildBlockSummaries>;
  recentWins: CoverageUnit[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="rounded-lg border-amber-200 bg-amber-50/35 shadow-card">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700">
              <ShieldAlert className="h-2.5 w-2.5" />
            </span>
            <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-800">
              Blocks Needing Attention
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-1">
          {blockSummaries.length === 0 ? (
            <p className="rounded-md border border-dashed border-amber-200 bg-white/70 py-6 text-center text-[10px] text-muted-foreground">
              No block rows available.
            </p>
          ) : (
            blockSummaries.slice(0, 4).map((block) => (
              <div key={block.block} className="rounded-md border border-amber-100 bg-white px-3 py-2 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-extrabold text-[#172033]">
                      {block.block}
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {block.visited}/{block.total} visited
                    </p>
                  </div>
                  <p className="shrink-0 text-[9px] font-extrabold text-amber-800">
                    {block.pending} to cover
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-emerald-200 bg-emerald-50/45 shadow-card">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5" />
            </span>
            <CardTitle className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-800">
              Recent Visit Wins
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-1">
          {recentWins.length === 0 ? (
            <p className="rounded-md border border-dashed border-emerald-200 bg-white/70 py-6 text-center text-[10px] text-muted-foreground">
              No recent wins yet.
            </p>
          ) : (
            recentWins.slice(0, 6).map((unit) => (
              <div key={unit.id} className="rounded-md border border-emerald-100 bg-white px-3 py-2 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-extrabold uppercase text-[#172033]">
                      {unit.gp_name}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                      {unit.block_name}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-[9px] font-extrabold text-emerald-800">
                    {unit.lastVisit ? format(parseISO(unit.lastVisit.visited_on), "dd/MM/yyyy") : ""}
                    {typeof unit.daysPending === "number" ? ` - ${unit.daysPending} days ago` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MarkVisitsPanel(props: {
  addingStarterData: boolean;
  attentionUnits: CoverageUnit[];
  blockFilter: string;
  blocks: string[];
  clearing: boolean;
  deleteBusy: boolean;
  filteredUnits: CoverageUnit[];
  form: ReturnType<typeof useForm<VisitFormValues>>;
  marking: boolean;
  markingStatus: "visited" | "legacy" | null;
  pendingVisible: CoverageUnit[];
  selectedRecordCount: number;
  search: string;
  selectedIds: Set<string>;
  selectedCount: number;
  statusFilter: VisitStatus | typeof ALL;
  undoDisabled: boolean;
  undoing: boolean;
  onAddStarterData: () => void;
  onBlockFilterChange: (value: string) => void;
  onClearRecords: () => void;
  onClearSelection: () => void;
  onSearchChange: (value: string) => void;
  onSelectIds: (ids: string[]) => void;
  onStatusFilterChange: (value: string) => void;
  onSubmitLegacy: () => void;
  onSubmitVisited: () => void;
  onToggleUnit: (id: string) => void;
  onUndo: () => void;
}) {
  return (
    <aside className="2xl:sticky 2xl:top-20 2xl:self-start">
      <Card className="rounded-lg shadow-card">
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Mark Visits</CardTitle>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Select pending or visible GPs and record field coverage.
              </p>
            </div>
            <span className="text-[9px] font-bold text-[#172033]">{props.selectedCount} selected</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          <div className="grid gap-2 md:grid-cols-[minmax(150px,1fr)_minmax(120px,170px)_minmax(120px,170px)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={props.search}
                onChange={(event) => props.onSearchChange(event.target.value)}
                placeholder="Search GP"
                className="h-8 rounded-md pl-8 text-[10px]"
              />
            </div>
            <Select value={props.blockFilter} onValueChange={props.onBlockFilterChange}>
              <SelectTrigger className="h-8 rounded-md text-[10px]">
                <SelectValue placeholder="Block Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Blocks</SelectItem>
                {props.blocks.map((block) => (
                  <SelectItem key={block} value={block}>
                    {block}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={props.statusFilter} onValueChange={props.onStatusFilterChange}>
              <SelectTrigger className="h-8 rounded-md text-[10px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="visited">Visited</SelectItem>
                <SelectItem value="legacy">Legacy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/35 px-3 py-2">
            <span className="text-[10px] font-semibold text-[#172033]">
              {props.selectedCount} selected
            </span>
            <Badge variant="outline" className="h-5 px-2 text-[9px]">
              {props.filteredUnits.length} visible
            </Badge>
            <Badge variant="outline" className="h-5 px-2 text-[9px]">
              {props.selectedRecordCount} records
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md text-[9px] text-rose-700"
              onClick={() => props.onSelectIds(props.pendingVisible.map((unit) => unit.id))}
              disabled={props.pendingVisible.length === 0}
            >
              Select pending visible
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md text-[9px]"
              onClick={() => props.onSelectIds(props.filteredUnits.map((unit) => unit.id))}
              disabled={props.filteredUnits.length === 0}
            >
              Select visible
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md text-[9px]"
              onClick={props.onClearSelection}
              disabled={props.selectedCount === 0}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md text-[9px] text-amber-700"
              onClick={props.onUndo}
              disabled={props.undoDisabled}
              aria-busy={props.undoing}
            >
              {props.undoing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              {props.undoing ? "Undoing" : "Undo last"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md text-[9px] text-rose-700 hover:text-rose-800"
              onClick={props.onClearRecords}
              disabled={props.deleteBusy || props.selectedRecordCount === 0}
              aria-busy={props.clearing}
            >
              {props.clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="h-4 w-4" />
              )}
              {props.clearing ? "Clearing" : "Clear visits"}
            </Button>
          </div>

          <div className="max-h-[250px] overflow-y-auto rounded-lg border">
            {props.filteredUnits.length === 0 ? (
              <div className="flex min-h-[90px] flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  No GP rows match the filters.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md text-[10px]"
                  onClick={props.onAddStarterData}
                  disabled={props.addingStarterData}
                  aria-busy={props.addingStarterData}
                >
                  {props.addingStarterData ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {props.addingStarterData ? "Adding sample GPs" : "Add sample GPs"}
                </Button>
              </div>
            ) : (
              props.filteredUnits.map((unit) => (
                <label
                  key={unit.id}
                  className="flex cursor-pointer items-start gap-2 border-b bg-white px-3 py-2 last:border-b-0 hover:bg-muted/35"
                >
                  <Checkbox
                    checked={props.selectedIds.has(unit.id)}
                    onCheckedChange={() => props.onToggleUnit(unit.id)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="block truncate text-[11px] font-extrabold uppercase leading-tight text-[#334155]">
                        {unit.gp_name}
                      </span>
                      <StatusBadge status={unit.status} />
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
                      <span>{unit.block_name}</span>
                      <span>|</span>
                      <span>{unit.lastVisit ? "Visited" : "Never visited"}</span>
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <p className="mb-1 text-[10px] font-medium text-[#172033]">Date Picker</p>
              <Input id="visitedOn" type="date" className="h-8 text-[10px]" {...props.form.register("visitedOn")} />
              {props.form.formState.errors.visitedOn && (
                <p className="text-xs font-medium text-destructive">
                  {props.form.formState.errors.visitedOn.message}
                </p>
              )}
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium text-[#172033]">Visit Notes</p>
              <Textarea
                id="visitNotes"
                rows={1}
                placeholder="Visit notes"
                className="min-h-8 resize-none rounded-md py-1.5 text-[10px]"
                {...props.form.register("notes")}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="h-8 rounded-md bg-emerald-500 text-[10px] font-bold text-white hover:bg-emerald-600"
              onClick={props.onSubmitVisited}
              disabled={props.marking || props.selectedCount === 0}
              aria-busy={props.markingStatus === "visited"}
            >
              {props.markingStatus === "visited" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {props.markingStatus === "visited" ? "Marking Visited" : "Mark Visited"}
            </Button>
            <Button
              type="button"
              className="h-8 rounded-md bg-teal-500 text-[10px] font-bold text-white hover:bg-teal-600"
              onClick={props.onSubmitLegacy}
              disabled={props.marking || props.selectedCount === 0}
              aria-busy={props.markingStatus === "legacy"}
            >
              {props.markingStatus === "legacy" && <Loader2 className="h-4 w-4 animate-spin" />}
              {props.markingStatus === "legacy" ? "Marking Legacy" : "Legacy Visited"}
            </Button>
          </div>

          <CompactNextAttention units={props.attentionUnits} />
        </CardContent>
      </Card>
    </aside>
  );
}

function CompactNextAttention({ units }: { units: CoverageUnit[] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        Next Attention
      </p>
      {units.length === 0 ? (
        <p className="mt-2 text-[10px] text-muted-foreground">No immediate field visit attention items.</p>
      ) : (
        <div className="mt-2 space-y-1">
          {units.slice(0, 8).map((unit) => (
            <label key={unit.id} className="flex items-center gap-2 text-[10px] leading-tight text-[#334155]">
              <span className="h-2 w-2 rounded-full border border-[#94A3B8]" />
              <span className="truncate">
                {unit.gp_name} - {unit.block_name}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: VisitStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        status === "visited" && "border-success/30 bg-success/10 text-success",
        status === "pending" && "border-destructive/30 bg-destructive/10 text-destructive",
        status === "legacy" && "border-warning/40 bg-warning/25 text-warning-foreground",
      )}
    >
      {status}
    </Badge>
  );
}

function readDismissedFallbackVisitIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const value = window.localStorage.getItem(DISMISSED_FALLBACK_VISITS_STORAGE_KEY);
    if (!value) return new Set<string>();
    const parsed = JSON.parse(value);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function saveDismissedFallbackVisitIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DISMISSED_FALLBACK_VISITS_STORAGE_KEY,
    JSON.stringify([...ids]),
  );
}

async function loadFieldVisitUnits(ownerId: string | undefined) {
  if (!ownerId) return [];
  const { data, error } = await fieldVisitDb()
    .from("field_visit_units")
    .select("*, field_visit_records(*)")
    .order("block_name", { ascending: true })
    .order("gp_name", { ascending: true });
  if (error && isMissingFieldVisitSchemaError(error)) return readLocalFieldVisitUnits(ownerId);
  if (error) throw error;
  return (data ?? []) as FieldVisitUnitWithRecords[];
}

async function loadFieldVisitPlans(ownerId: string | undefined) {
  if (!ownerId) return [];
  const { data, error } = await fieldVisitDb()
    .from("field_visit_plans")
    .select("*, field_visit_plan_items(*)")
    .order("plan_date", { ascending: false })
    .limit(6);
  if (error && isMissingFieldVisitSchemaError(error)) return readLocalFieldVisitPlans(ownerId);
  if (error) throw error;
  return (data ?? []) as FieldVisitPlanWithItems[];
}

function isMissingFieldVisitSchemaError(error: Error) {
  const message = error.message.toLowerCase();
  return (
    message.includes("schema cache") ||
    message.includes("relation") ||
    message.includes("field_visit_units") ||
    message.includes("field_visit_records") ||
    message.includes("field_visit_plans") ||
    message.includes("field_visit_plan_items")
  );
}

function localFieldVisitStorageKey(ownerId: string) {
  return `${LOCAL_FIELD_VISIT_STORAGE_PREFIX}:${ownerId}`;
}

function readLocalFieldVisitStore(ownerId: string): LocalFieldVisitStore {
  const emptyStore: LocalFieldVisitStore = { units: [], records: [], plans: [], planItems: [] };
  if (typeof window === "undefined") return emptyStore;
  try {
    const saved = window.localStorage.getItem(localFieldVisitStorageKey(ownerId));
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<LocalFieldVisitStore>;
      const store = {
        units: Array.isArray(parsed.units) ? parsed.units : [],
        records: Array.isArray(parsed.records) ? parsed.records : [],
        plans: Array.isArray(parsed.plans) ? parsed.plans : [],
        planItems: Array.isArray(parsed.planItems) ? parsed.planItems : [],
      };
      const reconciled = reconcileLocalFieldVisitStore(ownerId, store);
      if (reconciled.changed) writeLocalFieldVisitStore(ownerId, reconciled.store);
      return reconciled.store;
    }
  } catch {
    // Rebuild the local fallback store below.
  }
  const store = {
    ...emptyStore,
    units: starterCoverageRows(ownerId).map((row) => unitRowToLocalUnit(row)),
  };
  writeLocalFieldVisitStore(ownerId, store);
  return store;
}

function reconcileLocalFieldVisitStore(ownerId: string, store: LocalFieldVisitStore) {
  const officialRows = starterCoverageRows(ownerId);
  const currentByKey = new Map(store.units.map((unit) => [coverageRowKey(unit), unit]));
  const now = new Date().toISOString();
  const nextUnits = officialRows.map((row) => {
    const existing = currentByKey.get(coverageRowKey(row));
    return existing ? { ...existing, ...row, field_visit_records: [] } : unitRowToLocalUnit(row, now);
  });
  const nextUnitIds = new Set(nextUnits.map((unit) => unit.id));
  const nextStore = {
    units: nextUnits,
    records: store.records.filter((record) => nextUnitIds.has(record.unit_id)),
    plans: store.plans,
    planItems: store.planItems.filter((item) => nextUnitIds.has(item.unit_id)),
  };
  const changed =
    store.units.length !== DANTEWADA_GP_COUNT ||
    nextStore.records.length !== store.records.length ||
    nextStore.planItems.length !== store.planItems.length ||
    nextUnits.some((unit, index) => coverageRowKey(unit) !== coverageRowKey(officialRows[index]));
  return { store: nextStore, changed };
}

function writeLocalFieldVisitStore(ownerId: string, store: LocalFieldVisitStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localFieldVisitStorageKey(ownerId), JSON.stringify(store));
}

function readLocalFieldVisitUnits(ownerId: string) {
  const store = readLocalFieldVisitStore(ownerId);
  return store.units
    .map((unit) => ({
      ...unit,
      field_visit_records: store.records
        .filter((record) => record.unit_id === unit.id)
        .sort((a, b) => b.visited_on.localeCompare(a.visited_on)),
    }))
    .sort((a, b) => a.block_name.localeCompare(b.block_name) || a.gp_name.localeCompare(b.gp_name));
}

function readLocalFieldVisitPlans(ownerId: string) {
  const store = readLocalFieldVisitStore(ownerId);
  return store.plans
    .map((plan) => ({
      ...plan,
      field_visit_plan_items: store.planItems
        .filter((item) => item.plan_id === plan.id)
        .sort((a, b) => a.route_order - b.route_order),
    }))
    .sort((a, b) => b.plan_date.localeCompare(a.plan_date))
    .slice(0, 6);
}

function upsertLocalFieldVisitUnits(ownerId: string, rows: UnitUpsertRow[]) {
  const store = readLocalFieldVisitStore(ownerId);
  const currentByKey = new Map(store.units.map((unit) => [coverageRowKey(unit), unit]));
  const now = new Date().toISOString();
  for (const row of rows) {
    const existing = currentByKey.get(coverageRowKey(row));
    const unit = existing
      ? { ...existing, ...row, updated_at: now }
      : unitRowToLocalUnit(row, now);
    currentByKey.set(coverageRowKey(row), unit);
  }
  store.units = Array.from(currentByKey.values());
  writeLocalFieldVisitStore(ownerId, store);
}

function replaceLocalFieldVisitUnits(ownerId: string, rows: UnitUpsertRow[]) {
  const store = readLocalFieldVisitStore(ownerId);
  const previousByKey = new Map(store.units.map((unit) => [coverageRowKey(unit), unit]));
  const nextUnits = rows.map((row) => {
    const previous = previousByKey.get(coverageRowKey(row));
    return previous ? { ...previous, ...row, updated_at: new Date().toISOString() } : unitRowToLocalUnit(row);
  });
  const nextIds = new Set(nextUnits.map((unit) => unit.id));
  store.units = nextUnits;
  store.records = store.records.filter((record) => nextIds.has(record.unit_id));
  store.planItems = store.planItems.filter((item) => nextIds.has(item.unit_id));
  writeLocalFieldVisitStore(ownerId, store);
}

function saveLocalVisitRecords(ownerId: string, rows: VisitRecordInsertRow[]) {
  const store = readLocalFieldVisitStore(ownerId);
  const now = new Date().toISOString();
  const records = rows.map((row, index) => ({
    id: localFieldVisitId("record", index),
    unit_id: row.unit_id,
    visited_on: row.visited_on,
    status: row.status,
    notes: row.notes,
    recorded_by: row.recorded_by,
    created_at: now,
  }));
  const legacyUnitIds = new Set(records.filter((record) => record.status === "legacy").map((record) => record.unit_id));
  store.records = [...records, ...store.records];
  store.units = store.units.map((unit) =>
    legacyUnitIds.has(unit.id) ? { ...unit, is_legacy: true, updated_at: now } : unit,
  );
  writeLocalFieldVisitStore(ownerId, store);
  return records;
}

function deleteLocalVisitRecords(ownerId: string, ids: string[]) {
  const store = readLocalFieldVisitStore(ownerId);
  const idSet = new Set(ids);
  store.records = store.records.filter((record) => !idSet.has(record.id));
  writeLocalFieldVisitStore(ownerId, store);
}

function createLocalFieldVisitPlan(
  ownerId: string,
  row: PlanInsertRow,
  unitIds: string[],
  message: string | undefined,
) {
  const store = readLocalFieldVisitStore(ownerId);
  const now = new Date().toISOString();
  const plan: FieldVisitPlanWithItems = {
    id: localFieldVisitId("plan"),
    owner_id: row.owner_id,
    title: row.title,
    plan_date: row.plan_date,
    notes: row.notes,
    status: row.status,
    created_at: now,
    updated_at: now,
  };
  const items = unitIds.map((unitId, index) => ({
    id: localFieldVisitId("item", index),
    plan_id: plan.id,
    unit_id: unitId,
    route_order: index + 1,
    assigned_to: null,
    message: message?.trim() || null,
    created_at: now,
  }));
  store.plans = [plan, ...store.plans];
  store.planItems = [...items, ...store.planItems];
  writeLocalFieldVisitStore(ownerId, store);
  return plan;
}

function updateLocalFieldVisitPlan(
  ownerId: string,
  id: string,
  patch: Partial<Pick<FieldVisitPlan, "status" | "notes" | "plan_date" | "title">>,
) {
  const store = readLocalFieldVisitStore(ownerId);
  const now = new Date().toISOString();
  store.plans = store.plans.map((plan) =>
    plan.id === id ? { ...plan, ...patch, updated_at: now } : plan,
  );
  writeLocalFieldVisitStore(ownerId, store);
}

function deleteLocalFieldVisitPlan(ownerId: string, id: string) {
  const store = readLocalFieldVisitStore(ownerId);
  store.plans = store.plans.filter((plan) => plan.id !== id);
  store.planItems = store.planItems.filter((item) => item.plan_id !== id);
  writeLocalFieldVisitStore(ownerId, store);
}

function unitRowToLocalUnit(row: UnitUpsertRow, timestamp = new Date().toISOString()) {
  return {
    id: localFieldVisitId("unit"),
    owner_id: row.owner_id,
    administrative_unit: row.administrative_unit,
    block_name: row.block_name,
    gp_name: row.gp_name,
    latitude: row.latitude,
    longitude: row.longitude,
    is_legacy: row.is_legacy,
    priority_score: row.priority_score,
    created_at: timestamp,
    updated_at: timestamp,
    field_visit_records: [],
  };
}

function localFieldVisitId(prefix: string, index = 0) {
  const random =
    typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `local-${prefix}-${Date.now()}-${index}-${random}`;
}

function buildBlockSummaries(units: CoverageUnit[]) {
  const map = new Map<string, CoverageUnit[]>();
  for (const unit of units) {
    map.set(unit.block_name, [...(map.get(unit.block_name) ?? []), unit]);
  }
  return Array.from(map.entries())
    .map(([block, blockUnits]) => {
      const metrics = coverageMetrics(blockUnits);
      return {
        block,
        total: metrics.total,
        pending: metrics.actionNeeded,
        coverage: metrics.coverage,
      };
    })
    .sort((a, b) => b.pending - a.pending || a.coverage - b.coverage);
}

function coverageRowKey(
  row: Pick<UnitUpsertRow, "administrative_unit" | "block_name" | "gp_name">,
) {
  return [row.administrative_unit, row.block_name, row.gp_name]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
}

function csvImportImpact(
  preview: CsvImportPreview,
  existingUnits: CoverageUnit[],
  ownerId: string | undefined,
): CsvImportImpact {
  const importKeys = new Set(preview.rows.map(coverageRowKey));
  const existingKeys = new Set(existingUnits.map(coverageRowKey));
  const added = preview.rows.filter((row) => !existingKeys.has(coverageRowKey(row))).length;
  const updated = preview.rows.length - added;
  const removed = existingUnits.filter(
    (unit) => unit.owner_id === ownerId && !importKeys.has(coverageRowKey(unit)),
  ).length;
  const skipped = Math.max(0, preview.totalRows - preview.rows.length);
  return { added, updated, removed, skipped };
}

function starterCoverageRows(ownerId: string): UnitUpsertRow[] {
  return DANTEWADA_GP_BLOCKS.flatMap(({ block, center, gps }) =>
    gps.map((gpName, index) => {
      const offset = mapMarkerOffset(index, gps.length);
      return {
        owner_id: ownerId,
        administrative_unit: "Dantewada",
        block_name: block,
        gp_name: gpName,
        latitude: Number((center.latitude + offset.latitude).toFixed(7)),
        longitude: Number((center.longitude + offset.longitude).toFixed(7)),
        is_legacy: false,
        priority_score: 55 + ((index * 7) % 41),
      };
    }),
  );
}

const DANTEWADA_GP_BLOCKS = [
  {
    block: "Dantewada",
    center: { latitude: 18.9, longitude: 81.35 },
    gps: [
      "BADEBACHELI",
      "BADEKAMELI",
      "BALOOD",
      "BALPET",
      "BENPAL",
      "BHANSI",
      "BHOGAM",
      "CHANDENAR",
      "CHITALANKA",
      "CHITALOOR",
      "DEGALRAS",
      "DHURLI",
      "DUGELI",
      "DUMAM",
      "GADAPAL",
      "GAMAWADA",
      "GANJENAR",
      "JARAM",
      "JHIRKA",
      "KAMALOOR",
      "KAWADGAON",
      "KAWALNAR",
      "KESHAPUR",
      "KUMHARRAS",
      "KUNDELI",
      "KUPER",
      "MANGNAR",
      "MASENAR",
      "MATENAR",
      "METAPAL",
      "METAPAL02",
      "MOLASNAR",
      "MURKEE",
      "MUSKEL",
      "NERLI",
      "NETAPUR",
      "PADHAPUR",
      "PANDEWAR",
      "PHULNAR",
      "PONDUM",
      "PONDUM2",
      "TEKNAR",
      "TOYALANKA",
      "TUDPARAS",
    ],
  },
  {
    block: "Geedam",
    center: { latitude: 19.06, longitude: 81.4 },
    gps: [
      "AALNAR",
      "BADEKARKA",
      "BADEKARLI",
      "BADEPANEDA",
      "BADEPANEDA 02",
      "BADESUROKHI",
      "BADETUMNAR",
      "BANGAPAL",
      "BHATPAL",
      "BINJAM",
      "BODLI",
      "BUDPADAR",
      "CHERPAL",
      "CHHINDNAR",
      "CHHOTETUMNAR",
      "FUNDRI",
      "GHOTPAL",
      "GHOTPAL02",
      "GUMALNAR",
      "GUMDA",
      "GUTOLI",
      "HARAM",
      "HARAM 02",
      "HARLA",
      "HAURNAR",
      "HIDPAL",
      "HIRANAR",
      "HIRANAR 02",
      "HITAMETA",
      "JAVANGA",
      "JHODIYA BADAM",
      "JODATARAI",
      "KARLI",
      "KARLI 02",
      "KASOLI",
      "KASOLI02",
      "KATULNAR",
      "KAURGAON",
      "KORKATI",
      "KORLAPAL",
      "KUNDENAR",
      "MADPAL",
      "MADSE",
      "MOPHALNAR",
      "MUCHNAR",
      "MUNDER",
      "MUSTALNAR",
      "NAGUL",
      "NAILAGODA",
      "PAHURNAR",
      "PHARASPAL",
      "RONJE",
      "SAMLUR",
      "SIYANAR",
      "TUMRIGUNDA",
      "UPET",
    ],
  },
  {
    block: "Katekalyan",
    center: { latitude: 18.63, longitude: 81.58 },
    gps: [
      "ATEPAL",
      "BADEBEDMA",
      "BADEGADAM",
      "BADEGUDRA",
      "BADELAKHAPAL",
      "BENGLUR",
      "BHUSARAS",
      "CHHOTEBEDMA",
      "CHHOTEGUDRA",
      "CHHOTELAKHAPAL",
      "CHIKPAL",
      "DHANIKARKA",
      "DHUDHIRAS",
      "DUWALIKARKA",
      "EDPAL",
      "GATAM",
      "GUDSE",
      "JANGAMPAL",
      "KATEKALYAN",
      "KORIRAS",
      "MAHARAKARKA",
      "MARJUM",
      "MATHADI",
      "MOKHPAL",
      "NADENAR",
      "NAYANAR",
      "PAKNACHUA",
      "PARCHELI",
      "PRATAPGIRI",
      "SURNAR",
      "TELAM",
      "TETAM",
      "TUMAKPAL",
    ],
  },
  {
    block: "Kuakonda",
    center: { latitude: 18.67, longitude: 81.25 },
    gps: [
      "ARANPUR",
      "ARBE",
      "BADE HADMA MUNDA",
      "BURGUM",
      "CHOLNAR",
      "GADHMIRI",
      "GONGPAL",
      "GUMIYAPAL",
      "HALBARAS",
      "HIROLI",
      "HITAWAR",
      "JABELI",
      "KADAMPAL",
      "KALEPAL",
      "KHUNTEPAL",
      "KODENAR",
      "KUTREM",
      "KUWAKONDA",
      "MADADI",
      "MADHKAMIRAS",
      "MAHARAHAURNAR",
      "MAILAWADA",
      "MULER",
      "NAHADI",
      "NAKULNAR",
      "NEELAVAYA",
      "PALNAR",
      "PHULPAD",
      "POTALI",
      "REGANAR",
      "REVALI",
      "SAMALWAR",
      "SAMELI",
      "SHYAMGIRI",
      "TANELI",
      "TIKANPAL",
    ],
  },
];

function mapMarkerOffset(index: number, total: number) {
  const angle = index * 2.399963229728653;
  const radius = 0.018 + (index / Math.max(1, total - 1)) * 0.155;
  return {
    latitude: Math.sin(angle) * radius,
    longitude: Math.cos(angle) * radius,
  };
}

function downloadCoverageTemplate() {
  const blob = new Blob([coverageCsvTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "field-visit-coverage-format.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markerColor(status: VisitStatus) {
  if (status === "visited") return "#16a34a";
  if (status === "legacy") return "#f59e0b";
  return "#dc2626";
}

function statusLabel(status: VisitStatus) {
  if (status === "visited") return "Visited GP";
  if (status === "legacy") return "Legacy GP";
  return "Pending GP";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] ?? char,
  );
}
