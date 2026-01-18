import React from "react"

export const Button = ({ onClick, children }:{onClick: () => void, children : React.ReactNode}) => {
    return <button onClick={onClick} className="px-8 py-4 text-2xl bg-[#5e9141] hover:bg-[#5dad31] text-white font-bold rounded">
        {children}
    </button>
}