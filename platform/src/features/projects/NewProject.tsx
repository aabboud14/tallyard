// /app/projects/new: the projects list with the New project dialog open over it. Closing returns to the list.
import { useNavigate } from 'react-router'
import { ProjectsList } from './ProjectsList'
import { NewProjectDialog } from './NewProjectDialog'

export function NewProject() {
  const navigate = useNavigate()
  return (
    <>
      <ProjectsList />
      <NewProjectDialog
        open
        onOpenChange={(open) => {
          if (!open) navigate('/app/projects', { replace: true })
        }}
      />
    </>
  )
}
