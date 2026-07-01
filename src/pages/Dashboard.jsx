import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Dashboard() {
  const { user, loading } = useAuth()

  // Show nothing while checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="opacity-60">Loading...</p>
      </div>
    )
  }

  // Protect the route: redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-lg mb-8 opacity-80">Welcome back, {user.name}.</p>

      <div className="rounded-2xl border border-light-card-border dark:border-dark-card-border bg-light-card dark:bg-dark-card shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Account</h2>
        <dl className="space-y-3">
          <div className="flex justify-between border-b border-light-card-border dark:border-dark-card-border pb-2">
            <dt className="opacity-70">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between border-b border-light-card-border dark:border-dark-card-border pb-2">
            <dt className="opacity-70">Username</dt>
            <dd className="font-medium">{user.username}</dd>
          </div>
          <div className="flex justify-between border-b border-light-card-border dark:border-dark-card-border pb-2">
            <dt className="opacity-70">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Role</dt>
            <dd className="font-medium capitalize">{user.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default Dashboard
