'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, updateUser, resetUserPassword } from '@/app/actions/admin'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Key } from 'lucide-react'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'MANAGER',     label: 'Manager'     },
  { value: 'MARKETING',   label: 'Marketing'   },
  { value: 'SALES',       label: 'Sales'       },
]

interface UserFormProps {
  businessUnits: { id: string; name: string; prefix: string }[]
  departments:   { id: string; name: string }[]
  // If editing, pass the existing user
  user?: {
    id:              string
    name:            string | null
    email:           string
    role:            string
    phone:           string | null
    businessUnitIds: string[]
    departmentIds:   string[]
  }
}

export function UserForm({ businessUnits, departments, user }: UserFormProps) {
  const isEdit = !!user
  const [pending, startTransition] = useTransition()
  const [showPw,  setShowPw]       = useState(false)
  const [showReset, setShowReset]  = useState(false)
  const [newPw,   setNewPw]        = useState('')
  const [resetPending, startReset] = useTransition()

  const [selectedBUs, setSelectedBUs]     = useState<string[]>(user?.businessUnitIds ?? [])
  const [selectedDepts, setSelectedDepts] = useState<string[]>(user?.departmentIds   ?? [])

  function toggleBU(id: string) {
    setSelectedBUs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleDept(id: string) {
    setSelectedDepts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('businessUnitIds', selectedBUs.join(','))
    fd.set('departmentIds',   selectedDepts.join(','))

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateUser(fd)
        } else {
          await createUser(fd)
        }
        // redirect happens inside the action
      } catch (err: any) {
        toast.error(err.message ?? 'Something went wrong')
      }
    })
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault()
    startReset(async () => {
      try {
        await resetUserPassword(user!.id, newPw)
        toast.success('Password updated')
        setNewPw('')
        setShowReset(false)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to reset password')
      }
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {isEdit && <input type="hidden" name="id" value={user.id} />}

        {/* Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input
              name="name"
              defaultValue={user?.name ?? ''}
              placeholder="John Doe"
              className="input-base"
              required
              minLength={2}
            />
          </Field>
          <Field label="Email Address" required>
            <input
              type="email"
              name="email"
              defaultValue={user?.email ?? ''}
              placeholder="john@company.com"
              className="input-base"
              required
            />
          </Field>
        </div>

        {/* Password (only on create, or optional on edit) */}
        {!isEdit && (
          <Field label="Password" required>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                placeholder="Min. 8 characters"
                className="input-base pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--nf-muted)' }}
                onClick={() => setShowPw((v) => !v)}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        )}

        {/* Role + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Role" required>
            <select name="role" defaultValue={user?.role ?? 'SALES'} className="input-base" required>
              {ROLES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Phone (optional)">
            <input
              name="phone"
              defaultValue={user?.phone ?? ''}
              placeholder="+20 10 0000 0000"
              className="input-base"
            />
          </Field>
        </div>

        {/* Entities */}
        <Field label="Entities" required>
          <div className="flex flex-wrap gap-2 mt-1">
            {businessUnits.map((bu) => {
              const active = selectedBUs.includes(bu.id)
              return (
                <button
                  key={bu.id}
                  type="button"
                  onClick={() => toggleBU(bu.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? 'var(--nf-accent-glow)' : 'var(--nf-surface-2)',
                    color:      active ? 'var(--nf-accent)' : 'var(--nf-muted)',
                    border:     `1px solid ${active ? 'var(--nf-accent)' : 'var(--nf-border)'}`,
                  }}>
                  {bu.prefix} — {bu.name}
                </button>
              )
            })}
          </div>
          {selectedBUs.length === 0 && (
            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Select at least one Entity</p>
          )}
        </Field>

        {/* Departments */}
        <Field label="Departments (for Sales users)">
          <div className="flex flex-wrap gap-2 mt-1">
            {departments.map((d) => {
              const active = selectedDepts.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDept(d.id)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    background: active ? '#818CF820' : 'var(--nf-surface-2)',
                    color:      active ? '#818CF8' : 'var(--nf-muted)',
                    border:     `1px solid ${active ? '#818CF8' : 'var(--nf-border)'}`,
                  }}>
                  {d.name}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={pending || selectedBUs.length === 0} className="btn-primary">
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
          <a href="/admin/users" className="btn-ghost">Cancel</a>
        </div>
      </form>

      {/* Reset password panel (edit only) */}
      {isEdit && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>Reset Password</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--nf-muted)' }}>
                Set a new password for this user
              </p>
            </div>
            {!showReset && (
              <button onClick={() => setShowReset(true)} className="btn-outline text-sm">
                <Key className="w-4 h-4" />
                Reset Password
              </button>
            )}
          </div>

          {showReset && (
            <form onSubmit={handleReset} className="flex items-end gap-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password (min. 8 chars)"
                    className="input-base pr-10"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--nf-muted)' }}
                    onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={resetPending || newPw.length < 8} className="btn-primary">
                {resetPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Update
              </button>
              <button type="button" onClick={() => { setShowReset(false); setNewPw('') }} className="btn-ghost">
                Cancel
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nf-muted)' }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
    </div>
  )
}
