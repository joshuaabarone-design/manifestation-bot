import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, Loader2, Smartphone, MessageSquare } from "lucide-react";
import type { ReminderSettings } from "@shared/schema";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const REMINDER_TIMES = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
];

export default function Settings() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");

  const { data: settings, isLoading } = useQuery<ReminderSettings | null>({
    queryKey: ["/api/reminders/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ReminderSettings>) => {
      return apiRequest("PUT", "/api/reminders/settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/settings"] });
      toast({
        title: "Settings saved",
        description: "Your reminder preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (enabled: boolean) => {
    updateMutation.mutate({ isEnabled: enabled });
  };

  const handleTimeChange = (time: string) => {
    updateMutation.mutate({ reminderTime: time });
  };

  const handleTimezoneChange = (timezone: string) => {
    updateMutation.mutate({ timezone });
  };

  const handleDeliveryMethodChange = (method: string) => {
    updateMutation.mutate({ deliveryMethod: method });
  };

  const handlePhoneNumberSave = () => {
    if (!phoneNumber.match(/^\+?[1-9]\d{9,14}$/)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ phoneNumber, deliveryMethod: "sms" });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const currentSettings = settings || {
    isEnabled: false,
    reminderTime: "09:00",
    timezone: "America/New_York",
    deliveryMethod: "app",
    phoneNumber: "",
  };

  // Initialize phone number from settings when loaded
  if (settings?.phoneNumber && phoneNumber === "") {
    setPhoneNumber(settings.phoneNumber);
  }

  return (
    <Layout>
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your daily affirmation reminders
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Daily Affirmation Reminders</CardTitle>
                <CardDescription>
                  Get reminded to practice your affirmations each day
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminder-toggle" className="text-base">
                  Enable Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show a daily affirmation when you open the app
                </p>
              </div>
              <Switch
                id="reminder-toggle"
                data-testid="switch-reminder-toggle"
                checked={currentSettings.isEnabled ?? false}
                onCheckedChange={handleToggle}
                disabled={updateMutation.isPending}
              />
            </div>

            {currentSettings.isEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="delivery-method" className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Delivery Method
                  </Label>
                  <Select
                    value={currentSettings.deliveryMethod ?? "app"}
                    onValueChange={handleDeliveryMethodChange}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger id="delivery-method" data-testid="select-delivery-method">
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="app">In-App Only</SelectItem>
                      <SelectItem value="sms">SMS Text Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentSettings.deliveryMethod === "sms" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone-number" className="text-base flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone-number"
                        data-testid="input-phone-number"
                        type="tel"
                        placeholder="+1234567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        data-testid="button-save-phone"
                        onClick={handlePhoneNumberSave}
                        disabled={updateMutation.isPending}
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your phone number with country code to receive daily affirmations via SMS
                    </p>
                    {currentSettings.phoneNumber && (
                      <p className="text-xs text-green-600">
                        Currently set to: {currentSettings.phoneNumber}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reminder-time" className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Affirmation Time
                  </Label>
                  <Select
                    value={currentSettings.reminderTime ?? "09:00"}
                    onValueChange={handleTimeChange}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger id="reminder-time" data-testid="select-reminder-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_TIMES.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {currentSettings.deliveryMethod === "sms" 
                      ? "You'll receive your daily affirmation via SMS at this time"
                      : "When you open the app around this time, you'll see your daily affirmation"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-base">
                    Timezone
                  </Label>
                  <Select
                    value={currentSettings.timezone ?? "America/New_York"}
                    onValueChange={handleTimezoneChange}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger id="timezone" data-testid="select-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>In-App:</strong> When you open the app around your scheduled time, 
              you'll see a beautiful daily affirmation modal.
            </p>
            <p>
              <strong>SMS:</strong> Receive your daily affirmation as a text message 
              at your scheduled time. Perfect for starting your morning right!
            </p>
            <p>
              Each affirmation is AI-generated to help keep you aligned with your 
              manifestation journey.
            </p>
            <p className="text-xs italic">
              Tip: Add this app to your home screen for quick access.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
