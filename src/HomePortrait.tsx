import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { profile } from "./content";

export function HomePortrait() {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(profile.portrait.src) && !failed;
  return (
    <div
      className={`home-portrait ${hasPhoto ? "has-photo" : "awaiting-photo"}`}
    >
      <div className="portrait-frame">
        {hasPhoto ? (
          <img
            src={profile.portrait.src}
            alt={profile.portrait.alt}
            width={514}
            height={462}
            fetchPriority="high"
            onError={() => setFailed(true)}
            style={{ objectPosition: profile.portrait.position }}
          />
        ) : (
          <div
            className="portrait-monogram"
            aria-label="Imane Benzegunine monogram; portrait not yet supplied"
          >
            <span className="eyebrow">THE PERSON BEHIND THE PIPELINES</span>
            <span className="portrait-initials" aria-hidden="true">
              ib<span>.</span>
            </span>
            <span className="portrait-pending">Portrait coming soon</span>
          </div>
        )}
      </div>
      <div className="portrait-caption">
        <div>
          <strong>Imane Benzegunine</strong>
          <span>Data Engineer</span>
        </div>
        <Link to="/about" aria-label="More about Imane">
          <ArrowUpRight size={24} />
        </Link>
      </div>
      <span className="portrait-side-label" aria-hidden="true">
        DATA · INTENTION · IMPACT
      </span>
    </div>
  );
}
