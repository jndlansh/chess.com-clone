import React from "react"

type ButtonVariant = "green" | "grey"

interface ButtonProps {
    onClick: () => void
    children: React.ReactNode
    className?: string
    variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
    green: "bg-[#5e9141] hover:bg-[#5dad31] text-white",
    grey: "bg-gray-600 hover:bg-gray-700 text-white"
}

export const Button = ({ onClick, children, className, variant = "green" }: ButtonProps) => {
    const variantClassName = variantStyles[variant]
    
    return <button 
        onClick={onClick} 
        className={`px-14 py-4 text-2xl font-bold rounded ${variantClassName} ${className}`}
    >
        {children}
    </button>
}