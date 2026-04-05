import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { BookmarkCheck, Sparkles, Copy, Trash2, Eye, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const initialCampaigns = [
  {
    id: 1,
    name: "Spring Exterior Painting Promo",
    platform: "Facebook",
    goal: "Generate Leads",
    date: "Apr 2, 2025",
    ads: 4,
    status: "Active",
    business: "Mike's Painting",
  },
  {
    id: 2,
    name: "Free Roof Inspection April",
    platform: "Google",
    goal: "Drive Phone Calls",
    date: "Mar 28, 2025",
    ads: 3,
    status: "Draft",
    business: "Mike's Painting",
  },
  {
    id: 3,
    name: "Spring Lawn Cleanup Special",
    platform: "Instagram",
    goal: "Promote an Offer",
    date: "Mar 20, 2025",
    ads: 5,
    status: "Active",
    business: "GreenThumb Landscaping",
  },
  {
    id: 4,
    name: "Deep Cleaning Summer Bundle",
    platform: "Nextdoor",
    goal: "Promote an Offer",
    date: "Mar 15, 2025",
    ads: 3,
    status: "Archived",
    business: "Summit Cleaning",
  },
  {
    id: 5,
    name: "Emergency Roof Repair",
    platform: "Facebook",
    goal: "Drive Phone Calls",
    date: "Mar 10, 2025",
    ads: 4,
    status: "Active",
    business: "Mike's Painting",
  },
  {
    id: 6,
    name: "Cabinet Painting Remodel",
    platform: "Instagram",
    goal: "Generate Leads",
    date: "Mar 5, 2025",
    ads: 3,
    status: "Draft",
    business: "Mike's Painting",
  },
];

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  Draft: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
  Archived: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100",
};

const platformColors: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  Instagram: "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100",
  Google: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  Nextdoor: "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100",
  "Print Flyer": "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
};

export default function SavedCampaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [search, setSearch] = useState("");

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.platform.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast({ title: "Campaign deleted", description: "The campaign has been removed." });
  };

  const handleDuplicate = (campaign: typeof campaigns[0]) => {
    const newCampaign = {
      ...campaign,
      id: Math.max(...campaigns.map(c => c.id)) + 1,
      name: `${campaign.name} (Copy)`,
      date: "Today",
      status: "Draft",
    };
    setCampaigns(prev => [newCampaign, ...prev]);
    toast({ title: "Campaign duplicated!", description: `"${campaign.name}" has been duplicated as a draft.` });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-primary" />
            Saved Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {campaigns.length} campaigns saved · {campaigns.filter(c => c.status === "Active").length} active
          </p>
        </div>
        <Link href="/generate">
          <Button className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Campaign Grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(campaign => (
            <Card key={campaign.id} className="flex flex-col hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={`text-xs shrink-0 ${platformColors[campaign.platform] || "bg-muted text-muted-foreground"}`}>
                    {campaign.platform}
                  </Badge>
                  <Badge className={`text-xs shrink-0 ${statusColors[campaign.status]}`}>
                    {campaign.status}
                  </Badge>
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">{campaign.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{campaign.business}</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Goal:</span>
                    <span className="font-medium">{campaign.goal}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Variations:</span>
                    <span className="font-medium">{campaign.ads} ads</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{campaign.date}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => handleDuplicate(campaign)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive hover:border-destructive/40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{campaign.name}" and all its ad variations. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        Delete Campaign
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <BookmarkCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {search ? "No matching campaigns" : "No saved campaigns yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {search
              ? "Try a different search term."
              : "Create your first campaign and save it here to build your lead generation library."}
          </p>
          {!search && (
            <Link href="/generate">
              <Button className="gap-2">
                <Sparkles className="w-4 h-4" />
                Create Your First Campaign
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
