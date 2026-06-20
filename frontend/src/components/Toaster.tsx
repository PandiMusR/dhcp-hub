import { useToast } from "@/lib/toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="flex items-start gap-3">
            {variant === "success" && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />}
            {variant === "destructive" && <XCircle className="h-5 w-5 text-red-300 mt-0.5 shrink-0" />}
            {!variant && <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
