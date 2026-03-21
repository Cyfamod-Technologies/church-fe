import Link from "next/link";

export default function ChurchProfileEditRoute() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Edit Church Profile</h4>
                  <p className="text-secondary mb-0">Dedicated edit route, separated from the profile view page.</p>
                </div>
                <Link className="btn btn-outline-secondary" href="/church-profile">
                  Back to Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="alert alert-info mb-0">The dedicated profile edit form is the next page to wire here.</div>
        </div>
      </div>
    </div>
  );
}
