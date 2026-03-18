export default function BulkChildSelector({ children, selected, onChange }) {
  const classrooms = [...new Set(children.map((c) => c.classroom_id))]

  function toggleChild(child) {
    const isSelected = selected.some((s) => s.child_id === child.child_id)
    if (isSelected) {
      onChange(selected.filter((s) => s.child_id !== child.child_id))
    } else {
      onChange([...selected, child])
    }
  }

  function toggleClassroom(classroomId) {
    const classroomChildren = children.filter((c) => c.classroom_id === classroomId)
    const allSelected = classroomChildren.every((c) =>
      selected.some((s) => s.child_id === c.child_id)
    )
    if (allSelected) {
      onChange(selected.filter((s) => s.classroom_id !== classroomId))
    } else {
      const toAdd = classroomChildren.filter((c) => !selected.some((s) => s.child_id === c.child_id))
      onChange([...selected, ...toAdd])
    }
  }

  return (
    <div className="bulk-selector">
      {classrooms.map((classroomId) => {
        const classroomChildren = children.filter((c) => c.classroom_id === classroomId)
        const allSelected = classroomChildren.every((c) =>
          selected.some((s) => s.child_id === c.child_id)
        )
        return (
          <div key={classroomId} className="bulk-classroom-group">
            <div className="bulk-classroom-header">
              <label className="bulk-classroom-label">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleClassroom(classroomId)}
                />
                <strong>{classroomId.replace('_', ' ').toUpperCase()}</strong>
                <span className="bulk-count">({classroomChildren.length} children)</span>
              </label>
            </div>
            <div className="bulk-children-list">
              {classroomChildren.map((child) => {
                const isSelected = selected.some((s) => s.child_id === child.child_id)
                return (
                  <label key={child.child_id} className="bulk-child-item">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChild(child)}
                    />
                    <span className="bulk-child-name">{child.name}</span>
                    <span className="bulk-child-email">{child.parent_email}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
      {selected.length > 0 && (
        <p className="bulk-selected-count">{selected.length} children selected</p>
      )}
    </div>
  )
}
