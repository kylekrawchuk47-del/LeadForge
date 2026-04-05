import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Upload, Palette, CheckCircle2 } from "lucide-react";

const categories = [
  "Painting & Coatings",
  "Roofing",
  "Landscaping & Lawn Care",
  "Cleaning Services",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Pest Control",
  "Pressure Washing",
  "Tree Services",
  "Handyman / General Contractor",
  "Flooring",
  "Windows & Doors",
  "Pool Services",
  "Moving Services",
];

const toneOptions = [
  { value: "professional", label: "Professional", desc: "Polished, trustworthy, credible" },
  { value: "friendly", label: "Friendly & Warm", desc: "Approachable, community-focused" },
  { value: "energetic", label: "Bold & Energetic", desc: "High-energy, attention-grabbing" },
  { value: "urgent", label: "Urgent & Direct", desc: "Limited time, act now" },
  { value: "educational", label: "Educational", desc: "Expert, informative, helpful" },
  { value: "humorous", label: "Lighthearted", desc: "Fun, memorable, relatable" },
];

const ctaOptions = [
  "Get a Free Estimate",
  "Call Now",
  "Book Online",
  "Request a Quote",
  "Schedule Today",
  "Learn More",
  "See Our Work",
  "Contact Us",
];

const brandColors = [
  "#FF6B35", "#2563EB", "#16A34A", "#DC2626", "#9333EA",
  "#EA580C", "#0891B2", "#65A30D", "#7C3AED", "#DB2777",
];

export default function BusinessProfile() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [selectedTone, setSelectedTone] = useState("professional");
  const [selectedColor, setSelectedColor] = useState("#FF6B35");
  const [form, setForm] = useState({
    businessName: "Mike's Painting",
    category: "Painting & Coatings",
    city: "Austin, TX",
    services: "Interior & exterior painting, deck staining, fence painting, cabinet painting",
    idealCustomer: "Homeowners aged 35-65 who value quality craftsmanship and are willing to pay a premium",
    phone: "(512) 555-0134",
    website: "www.mikespaintingaustin.com",
    offer: "Free color consultation + 10% off any interior project over $1,000",
    brandDescription: "Family-owned painting company serving Austin since 2012. We show up on time, clean up after ourselves, and stand behind every job with a 2-year warranty.",
    testimonials: `"Mike's team transformed our kitchen cabinets — looked brand new!" — Sarah W.
"Best painting crew in Austin. Honest pricing and flawless work." — Tom R.`,
    preferredCta: "Get a Free Estimate",
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    toast({
      title: "Profile saved!",
      description: "Your business profile has been updated successfully.",
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Business Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set up your business details once — the AI uses these to write every ad.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 shrink-0">
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
            <CardDescription>The core details about your business</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={form.businessName}
                onChange={e => handleChange("businessName", e.target.value)}
                placeholder="e.g. Mike's Painting"
              />
            </div>
            <div className="space-y-2">
              <Label>Business Category</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City / Service Area</Label>
              <Input
                value={form.city}
                onChange={e => handleChange("city", e.target.value)}
                placeholder="e.g. Austin, TX"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={form.phone}
                onChange={e => handleChange("phone", e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={e => handleChange("website", e.target.value)}
                placeholder="www.yourbusiness.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Services & Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services & Target Customer</CardTitle>
            <CardDescription>Help the AI understand what you do and who you serve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Services Offered</Label>
              <Textarea
                value={form.services}
                onChange={e => handleChange("services", e.target.value)}
                placeholder="List your main services..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Ideal Customer</Label>
              <Textarea
                value={form.idealCustomer}
                onChange={e => handleChange("idealCustomer", e.target.value)}
                placeholder="Describe who your best customers are..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Offer or Promotion</Label>
              <Input
                value={form.offer}
                onChange={e => handleChange("offer", e.target.value)}
                placeholder="e.g. Free estimate + 10% off first job"
              />
            </div>
          </CardContent>
        </Card>

        {/* Brand Voice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Voice & Tone</CardTitle>
            <CardDescription>Choose the tone that best matches your brand personality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {toneOptions.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTone === tone.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="font-medium text-sm">{tone.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tone.desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Brand Description & Social Proof */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Story & Social Proof</CardTitle>
            <CardDescription>Used to add authenticity and credibility to your ads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Brand Description</Label>
              <Textarea
                value={form.brandDescription}
                onChange={e => handleChange("brandDescription", e.target.value)}
                placeholder="What makes your business different? Why do customers choose you?"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Testimonials (optional)</Label>
              <Textarea
                value={form.testimonials}
                onChange={e => handleChange("testimonials", e.target.value)}
                placeholder={`"Great work, highly recommend!" — John D.\n"Best price and quality in town." — Lisa M.`}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferred CTA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferred Call to Action</CardTitle>
            <CardDescription>The primary action you want customers to take</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ctaOptions.map(cta => (
                <button
                  key={cta}
                  onClick={() => handleChange("preferredCta", cta)}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                    form.preferredCta === cta
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {cta}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Brand Color
            </CardTitle>
            <CardDescription>Your primary brand color (used in image prompt suggestions)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {brandColors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-4 transition-all ${
                    selectedColor === color ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  className="w-10 h-10 rounded-full cursor-pointer border-0 bg-transparent"
                  title="Custom color"
                />
                <span className="text-sm text-muted-foreground font-mono">{selectedColor}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & Photos Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Logo & Brand Photos
            </CardTitle>
            <CardDescription>Upload your logo and sample project photos for image prompt suggestions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-sm">Drop your logo here, or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              <Button variant="outline" size="sm" className="mt-4">Choose File</Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-sm">Add project photos (optional)</p>
              <p className="text-xs text-muted-foreground mt-1">Upload up to 10 photos. Used as inspiration for image prompts.</p>
              <Button variant="outline" size="sm" className="mt-4">Choose Files</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className="gap-2">
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Profile Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Business Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
