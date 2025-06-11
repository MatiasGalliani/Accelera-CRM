import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Clock, Mail, ChevronDown, ChevronUp, Eye, Info } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

const EmailCard = ({ email, index, onUpdate, onRemove, isLast, isExpanded, onToggle }) => {
  const isConfigured = email.delay && email.subject && email.content;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "transition-all duration-200 border-2",
        isExpanded ? "shadow-lg border-primary/20" : "hover:shadow-md hover:border-primary/10",
        isConfigured && "border-green-500/20"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                isConfigured ? "bg-green-500/10" : "bg-primary/10"
              )}>
                <Mail className={cn(
                  "h-5 w-5 transition-colors",
                  isConfigured ? "text-green-500" : "text-primary"
                )} />
              </div>
              <div>
                <CardTitle className="text-lg font-medium">Email {index + 1}</CardTitle>
                <CardDescription className="flex items-center gap-2 mb-4">
                  {email.delay ? (
                    <>
                      <Clock className="h-3 w-3" />
                      Sends after {email.delay} hours
                    </>
                  ) : (
                    'Set delay to schedule'
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggle}
                      className="h-8 w-8"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isExpanded ? "Collapse" : "Expand"} email details
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!isLast && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Remove this email from sequence
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-4">
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={`delay-${email.id}`}>Delay (in hours)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Time to wait before sending this email after the previous one
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id={`delay-${email.id}`}
                      type="number"
                      min="0"
                      value={email.delay}
                      onChange={(e) => onUpdate(email.id, "delay", e.target.value)}
                      placeholder="e.g., 24"
                      className="max-w-[200px]"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor={`subject-${email.id}`}>Subject</Label>
                    <Input
                      id={`subject-${email.id}`}
                      value={email.subject}
                      onChange={(e) => onUpdate(email.id, "subject", e.target.value)}
                      placeholder="Enter email subject"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`content-${email.id}`}>Content</Label>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                    <Textarea
                      id={`content-${email.id}`}
                      value={email.content}
                      onChange={(e) => onUpdate(email.id, "content", e.target.value)}
                      placeholder="Enter email content"
                      className="min-h-[150px] resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const AutomaticEmailCreation = () => {
  const [emails, setEmails] = useState([
    { id: 1, delay: "", subject: "", content: "" }
  ]);
  const [expandedEmails, setExpandedEmails] = useState([1]);

  const addEmail = () => {
    if (emails.length >= 5) {
      toast.error("Maximum 5 automated emails allowed");
      return;
    }
    const newId = emails.length + 1;
    setEmails([...emails, { id: newId, delay: "", subject: "", content: "" }]);
    setExpandedEmails([...expandedEmails, newId]);
  };

  const removeEmail = (id) => {
    setEmails(emails.filter(email => email.id !== id));
    setExpandedEmails(expandedEmails.filter(emailId => emailId !== id));
  };

  const updateEmail = (id, field, value) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, [field]: value } : email
    ));
  };

  const toggleEmail = (id) => {
    setExpandedEmails(prev => 
      prev.includes(id) 
        ? prev.filter(emailId => emailId !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    // TODO: Implement Resend integration
    toast.success("Automated emails configuration saved");
  };

  const configuredEmails = emails.filter(email => email.delay && email.subject && email.content).length;
  const progress = (configuredEmails / emails.length) * 100;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between mt-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Email Sequence</h1>
            <p className="text-muted-foreground">
              Create a sequence of up to 5 automated emails to nurture your leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {configuredEmails} of {emails.length} emails configured
            </span>
            <Progress value={progress} className="w-[100px]" />
          </div>
        </div>
        <Separator />
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {emails.map((email, index) => (
            <EmailCard
              key={email.id}
              email={email}
              index={index}
              onUpdate={updateEmail}
              onRemove={removeEmail}
              isLast={emails.length === 1}
              isExpanded={expandedEmails.includes(email.id)}
              onToggle={() => toggleEmail(email.id)}
            />
          ))}
        </AnimatePresence>
        
        <div className="flex justify-between items-center pt-6">
          <Button
            variant="outline"
            onClick={addEmail}
            disabled={emails.length >= 5}
            className="gap-2 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Add Email
          </Button>
          
          <Button 
            onClick={handleSave} 
            className="gap-2 bg-primary hover:bg-primary/90 text-black"
            size="lg"
          >
            Save Sequence
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AutomaticEmailCreation;
