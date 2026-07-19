import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildWhatsAppUrl, isValidWhatsAppPhone } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type WhatsAppActionButtonProps = {
  phone?: string | null;
  message: string;
  className?: string;
  hideWhenInvalid?: boolean;
};

const tooltipText = "Send Task Details via WhatsApp";

export function WhatsAppActionButton({
  phone,
  message,
  className,
  hideWhenInvalid = false,
}: WhatsAppActionButtonProps) {
  const valid = isValidWhatsAppPhone(phone);
  if (hideWhenInvalid && !valid) return null;

  const openWhatsApp = () => {
    const url = phone ? buildWhatsAppUrl(phone, message) : null;
    if (!url) {
      toast.error("Assigned officer does not have a valid WhatsApp mobile number.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={tooltipText}
            title={tooltipText}
            onClick={openWhatsApp}
            className={cn(
              "h-8 w-8 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 hover:text-white",
              className,
            )}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
