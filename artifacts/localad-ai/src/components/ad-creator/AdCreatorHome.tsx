import React from "react";
import { Wrench, Gift, Camera, MapPin, UserPlus, Image as ImageIcon, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOALS = [
  { id: "promote-service", label: "Promote a Service", icon: Wrench, description: "Showcase what you do best" },
  { id: "seasonal-offer", label: "Seasonal Offer", icon: Gift, description: "Limited time promotions" },
  { id: "before-after", label: "Before & After", icon: Camera, description: "Show your transformation results" },
  { id: "local-awareness", label: "Local Awareness", icon: MapPin, description: "Get found in your area" },
  { id: "hiring", label: "Hiring", icon: UserPlus, description: "Find your next team member" },
];

interface RecentProject {
  id: string;
  businessName: string;
  service: string;
  goal: string;
  thumbnail: string | null;
  createdAt: string;
}

interface Props {
  onSelectGoal: (goal: string) => void;
  onOpenProject: (id: string) => void;
  recentProjects: RecentProject[];
  isLoading: boolean;
}

export function AdCreatorHome({ onSelectGoal, onOpenProject, recentProjects, isLoading }: Props) {
  return (
    <div className="min-h-full" style={{ background: "#060A14" }}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
            style={{ background: "rgba(25,211,255,0.1)", color: "#19D3FF", border: "1px solid rgba(25,211,255,0.2)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#19D3FF] animate-pulse" />
            AI Powered
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
            Create an Ad That Gets You Leads
          </h1>
          <p className="text-lg" style={{ color: "#8899AA" }}>
            Flyers, posters, and social promos in minutes — no design skills needed.
          </p>
        </div>

        {/* Goal Cards */}
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: "#4A6080" }}>
            What do you want to promote?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {GOALS.map((goal) => {
              const Icon = goal.icon;
              return (
                <button
                  key={goal.id}
                  onClick={() => onSelectGoal(goal.id)}
                  className="group p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: "#0C1528",
                    border: "1px solid rgba(26,38,64,1)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(25,211,255,0.4)";
                    (e.currentTarget as HTMLElement).style.background = "#0E1B30";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,38,64,1)";
                    (e.currentTarget as HTMLElement).style.background = "#0C1528";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                    style={{ background: "rgba(25,211,255,0.1)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#19D3FF" }} />
                  </div>
                  <p className="font-semibold text-white mb-1">{goal.label}</p>
                  <p className="text-sm" style={{ color: "#6B7A90" }}>{goal.description}</p>
                  <div
                    className="flex items-center gap-1 mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#19D3FF" }}
                  >
                    Get started <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Designs */}
        {(isLoading || recentProjects.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#4A6080" }}>
                Recent Designs
              </p>
              {recentProjects.length > 3 && (
                <button className="text-xs" style={{ color: "#19D3FF" }}>View all</button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "#0C1528" }}>
                    <div className="w-full h-32" style={{ background: "#1A2640" }} />
                    <div className="p-3">
                      <div className="h-3 rounded w-3/4 mb-2" style={{ background: "#1A2640" }} />
                      <div className="h-2 rounded w-1/2" style={{ background: "#1A2640" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {recentProjects.slice(0, 8).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onOpenProject(project.id)}
                    className="rounded-2xl overflow-hidden text-left group transition-all hover:scale-[1.02]"
                    style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,133,228,0.4)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,38,64,1)"; }}
                  >
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.businessName}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center" style={{ background: "#1A2640" }}>
                        <ImageIcon className="w-6 h-6" style={{ color: "#4A5568" }} />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-white text-xs font-semibold truncate">{project.businessName}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7A90" }}>{project.service}</p>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => onSelectGoal("promote-service")}
                  className="rounded-2xl flex flex-col items-center justify-center gap-2 p-4 transition-all hover:scale-[1.02]"
                  style={{ background: "#0C1528", border: "1px dashed rgba(26,38,64,1)", minHeight: 140 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(25,211,255,0.3)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,38,64,1)"; }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(25,211,255,0.1)" }}>
                    <Plus className="w-4 h-4" style={{ color: "#19D3FF" }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: "#4A6080" }}>New Ad</p>
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && recentProjects.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#0C1528", border: "1px dashed rgba(26,38,64,1)" }}
          >
            <ImageIcon className="w-10 h-10 mx-auto mb-3" style={{ color: "#2B85E4" }} />
            <p className="text-white font-medium mb-1">No ads yet</p>
            <p className="text-sm" style={{ color: "#6B7A90" }}>Select a goal above to create your first ad</p>
          </div>
        )}
      </div>
    </div>
  );
}
