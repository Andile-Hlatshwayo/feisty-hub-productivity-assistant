import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/feisty/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0,0,0,0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function CalendarPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

  const events = useQuery({
    queryKey: ["calendar", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events")
        .select("*")
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString())
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("calendar_events").insert({
        user_id: u.user.id, title, description, location,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event added");
      setOpen(false); setTitle(""); setDescription(""); setLocation(""); setStart(""); setEnd("");
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Plan your week. Add events with titles, times, and locations."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-500 hover:bg-indigo-400"><Plus className="size-4 mr-1" /> New event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" value={end} onChange={(e)=>setEnd(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(e)=>setLocation(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e)=>setDescription(e.target.value)} /></div>
                <Button onClick={() => add.mutate()} disabled={!title || !start || !end} className="w-full bg-indigo-500 hover:bg-indigo-400">Add event</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Week of {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}><ChevronLeft className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
          <Button size="icon" variant="outline" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const dayEvents = (events.data ?? []).filter((e) => new Date(e.start_time).toDateString() === d.toDateString());
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <Card key={d.toISOString()} className={isToday ? "border-indigo-500/60" : ""}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs flex justify-between">
                  <span>{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  <span className={isToday ? "text-cyan-400" : "text-muted-foreground"}>{d.getDate()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2 min-h-32">
                {dayEvents.map((e) => (
                  <div key={e.id} className="rounded border-l-2 border-indigo-500 bg-indigo-500/5 p-2 group">
                    <div className="flex justify-between items-start gap-1">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{e.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(e.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {e.location && <div className="text-[10px] text-muted-foreground truncate">{e.location}</div>}
                      </div>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 size-5" onClick={() => del.mutate(e.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}