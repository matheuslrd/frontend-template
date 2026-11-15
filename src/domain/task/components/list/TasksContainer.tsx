import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Flex, Result, Segmented, type SegmentedProps, Skeleton, theme } from 'antd';

import { makeListTasksQueryOptions } from '../../api/list-tasks.query';
import { useTaskActions } from '../../hooks/useTaskActions';
import { TASK_STATUS_LABELS } from '../../task.constant';
import type { Task } from '../../task.type';
import { CreateTaskModal } from '../create/CreateTaskModal';

import { TaskList } from './TaskList';

type StatusFilter = Task.Status | 'all';

const STATUS_FILTER_OPTIONS: SegmentedProps<StatusFilter>['options'] = [
    { label: 'All', value: 'all' },
    { label: TASK_STATUS_LABELS.open, value: 'open' },
    { label: TASK_STATUS_LABELS.done, value: 'done' },
];

export function TasksContainer() {
    const { token } = theme.useToken();
    const [status, setStatus] = useState<Task.Status | undefined>();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { data, error, isError, isPending, isSuccess } = useQuery(makeListTasksQueryOptions({ status }));
    const { removeTask, removingTaskId } = useTaskActions();

    return (
        <Flex vertical gap="middle" style={{ padding: token.paddingLG }}>
            <Flex justify="space-between" align="center">
                <Segmented<StatusFilter>
                    options={STATUS_FILTER_OPTIONS}
                    value={status ?? 'all'}
                    onChange={(value) => setStatus(value === 'all' ? undefined : value)}
                />
                <Button type="primary" onClick={() => setIsCreateOpen(true)}>New task</Button>
            </Flex>
            {isPending ? <Skeleton active /> : null}
            {isError ? <Result status="error" title={error.message} /> : null}
            {isSuccess ? <TaskList tasks={data} removingTaskId={removingTaskId} onRemove={removeTask} /> : null}
            <CreateTaskModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </Flex>
    );
}
