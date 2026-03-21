import type { SessionData } from "@/types/session";

interface SectionOverviewProps {
  title: string;
  subtitle: string;
  session: SessionData;
  cards: Array<{
    title: string;
    detail: string;
    tag: string;
  }>;
}

export function SectionOverview({
  title,
  subtitle,
  session,
  cards,
}: SectionOverviewProps) {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">{title}</h4>
                  <p className="text-secondary mb-0">{subtitle}</p>
                </div>
                <div className="border rounded p-3">
                  <span className="text-secondary small d-block mb-1">Workspace</span>
                  <strong>{session.church?.name || "Church Workspace"}</strong>
                  <div className="small text-secondary mt-1">Typed route inside nextjs-fe</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {cards.map((card, index) => (
          <div className="col-md-6 col-xl-4" key={card.title}>
            <div
              className={`card overview-details-box ${
                index % 4 === 0
                  ? "b-s-3-primary"
                  : index % 4 === 1
                    ? "b-s-3-success"
                    : index % 4 === 2
                      ? "b-s-3-warning"
                      : "b-s-3-info"
              }`}
            >
              <div className="card-body">
                <p className="text-dark f-w-600 mb-1">{card.tag}</p>
                <h4 className="mb-2">{card.title}</h4>
                <p className="text-secondary mb-0">{card.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
