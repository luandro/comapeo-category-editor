import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { sanitizeSvgForReact } from "@/lib/svg-utils";

/**
 * A wrapper around Radix UI's Slot component that sanitizes SVG attributes
 * to prevent React warnings about invalid DOM properties.
 */
export const SanitizedSlot = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<typeof Slot>
>((props, ref) => {
  // Create a new props object with sanitized children
  const sanitizedProps = { ...props };
  
  // Recursively sanitize SVG elements in children
  const sanitizeChildren = (children: React.ReactNode): React.ReactNode => {
    if (!children) return children;
    
    // Handle arrays of children
    if (Array.isArray(children)) {
      return React.Children.map(children, sanitizeChildren);
    }
    
    // Handle React elements
    if (React.isValidElement(children)) {
      // Check if it's an SVG element
      if (
        typeof children.type === "string" && 
        (children.type === "svg" || children.type.startsWith("svg:"))
      ) {
        // Create a new props object with camelCase attributes
        const newProps: Record<string, any> = {};
        
        // Convert kebab-case attributes to camelCase
        Object.entries(children.props).forEach(([key, value]) => {
          if (key === "clip-rule") {
            newProps.clipRule = value;
          } else if (key === "fill-rule") {
            newProps.fillRule = value;
          } else if (key === "stroke-width") {
            newProps.strokeWidth = value;
          } else if (key === "stroke-linecap") {
            newProps.strokeLinecap = value;
          } else if (key === "stroke-linejoin") {
            newProps.strokeLinejoin = value;
          } else {
            newProps[key] = value;
          }
        });
        
        // Recursively sanitize children of this element
        if (children.props.children) {
          newProps.children = sanitizeChildren(children.props.children);
        }
        
        // Create a new element with the sanitized props
        return React.cloneElement(children, newProps);
      }
      
      // For non-SVG elements, just sanitize their children
      if (children.props.children) {
        return React.cloneElement(
          children,
          { ...children.props, children: sanitizeChildren(children.props.children) }
        );
      }
    }
    
    // Return unchanged for primitive values
    return children;
  };
  
  // Sanitize the children
  sanitizedProps.children = sanitizeChildren(props.children);
  
  // Render the Slot with sanitized props
  return <Slot {...sanitizedProps} ref={ref} />;
});

SanitizedSlot.displayName = "SanitizedSlot";
