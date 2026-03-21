import Link from "next/link";

export default function ServiceScheduleEditRoute() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Edit Service Schedule</h4>
                  <p className="text-secondary mb-0">Dedicated edit route, separated from the schedule view page.</p>
                </div>
                <Link className="btn btn-outline-secondary" href="/service-schedule">
                  Back to Schedule
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="alert alert-info mb-0">The dedicated service schedule editor is the next page to wire here.</div>
        </div>
      </div>
    </div>
  );
}
