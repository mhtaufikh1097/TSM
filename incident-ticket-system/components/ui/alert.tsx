import * as React from "react"

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "border-gray-200 text-gray-900 [&>svg]:text-gray-600",
      destructive: "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600",
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]} ${className}`.trim()}
        {...props}
      />
    )
  }
)
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`text-sm [&_p]:leading-relaxed ${className}`.trim()} {...props} />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }
