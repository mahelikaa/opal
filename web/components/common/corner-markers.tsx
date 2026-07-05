export default function CornerMarkers() {
    return <div className="absolute inset-0 pointer-events-none">
        <span
            className="border-primary absolute bottom-4 left-4 z-20 size-4 border-b border-l"
        />
        <span
            className="border-primary absolute top-5 left-4 z-20 size-4 border-t border-l"
        />
        <span
            className="border-primary absolute right-4 bottom-4 z-20 size-4 border-r border-b"
        />
        <span
            className="border-primary absolute top-5 right-4 z-20 size-4 border-t border-r"
        />
    </div>
}