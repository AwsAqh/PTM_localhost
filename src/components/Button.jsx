import React from "react";


function Button({type,className,children,onClick,disabled}){

return <button disabled={disabled} type={type} className={className}  onClick={onClick} >{children}</button>

}
export default Button