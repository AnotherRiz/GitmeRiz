import { Link } from 'react-router-dom'

// 401 page: shown when the user is not authenticated / lacks valid session.
function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">
        401 | Unauthorized Access
      </h1>
      <Link
        to="/"
        className="px-5 py-2.5 bg-light-navbar dark:bg-dark-navbar hover:opacity-80 text-light-text dark:text-dark-text rounded-lg font-semibold shadow-md transition-opacity text-sm"
      >
        Back to Home
      </Link>
    </div>
  )
}

export default Unauthorized
