export function TypographyH1({className, children}) {
    return (
        <h1 className={`scroll-m-20 text-4xl font-extrabold tracking-tight text-balance ${className}`}>
            {children}
        </h1>
    )
}

export function TypographyH3({className, children}) {
    return (
        <h1 className={`scroll-m-20 text-xl font-extrabold tracking-tight text-balance ${className}`}>
            {children}
        </h1>
    )
}
