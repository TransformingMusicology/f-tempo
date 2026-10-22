import {useState, type MouseEvent} from 'react';

type Props = {
    src: string;
    alt: string;
    /** Magnification shown while the pointer is over the image. */
    zoom?: number;
};

/**
 * A page scan that magnifies the region under the pointer while hovering,
 * and shows a placeholder when the image cannot be loaded.
 */
export default function ScanImage({src, alt, zoom = 2.5}: Props) {
    const [failed, setFailed] = useState<string | null>(null);
    const [focus, setFocus] = useState<{x: number; y: number} | null>(null);

    if (failed === src) {
        return <div className="scan-missing" role="img" aria-label={alt}>Image unavailable<br /><small>{src}</small></div>;
    }

    const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setFocus({
            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        });
    };

    return (
        <div className="scan" onMouseMove={onMouseMove} onMouseLeave={() => setFocus(null)}>
            <img src={src} alt={alt} onError={() => setFailed(src)} />
            {focus && (
                <div
                    className="scan-zoom"
                    aria-hidden="true"
                    style={{
                        backgroundImage: `url("${src}")`,
                        backgroundSize: `${zoom * 100}%`,
                        backgroundPosition: `${focus.x * 100}% ${focus.y * 100}%`,
                    }}
                />
            )}
        </div>
    );
}
