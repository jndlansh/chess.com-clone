import React from "react"

export const Button = ({ onClick, children, className }: { 
    onClick: () => void, 
    children: React.ReactNode, 
    className?: string 
}) => {
    return <button 
        onClick={onClick} 
        className={`px-14 py-4 text-2xl bg-[#5e9141] hover:bg-[#5dad31] text-white font-bold rounded ${className}`}
    >
        {children}
    </button>
}