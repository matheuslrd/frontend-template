import { Button, Empty, Table, type TableProps, Tag } from 'antd';

import { formatTaskCreatedAt } from '../../helpers/task.helper';
import { TASK_STATUS_LABELS } from '../../task.constant';
import type { Task } from '../../task.type';

type Props = {
    tasks: Task.Model[],
    removingTaskId: Task.Model['id'] | null,
    onRemove: (taskId: Task.Model['id']) => Promise<void>,
};

export function TaskList({ tasks, removingTaskId, onRemove }: Props) {
    const columns: TableProps<Task.Model>['columns'] = [
        { title: 'Title', dataIndex: 'title' },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (status: Task.Status) => <Tag>{TASK_STATUS_LABELS[status]}</Tag>,
        },
        { title: 'Created', dataIndex: 'createdAt', render: formatTaskCreatedAt },
        {
            key: 'actions',
            render: (_, task) => (
                <Button
                    danger
                    size="small"
                    aria-label={`Delete ${task.title}`}
                    loading={task.id === removingTaskId}
                    onClick={() => onRemove(task.id)}
                >
                    Delete
                </Button>
            ),
        },
    ];

    return (
        <Table
            rowKey="id"
            columns={columns}
            dataSource={tasks}
            pagination={false}
            locale={{ emptyText: <Empty description="No tasks yet" /> }}
        />
    );
}
