import { useRef } from 'react';
import { Form, Input, Modal } from 'antd';

import type { Body as CreateTaskBody } from '../../api/create-task.query';
import { useTaskActions } from '../../hooks/useTaskActions';

type Props = {
    isOpen: boolean,
    onClose: () => void,
};

export function CreateTaskModal({ isOpen, onClose }: Props) {
    const [form] = Form.useForm<CreateTaskBody>();
    const { createTask } = useTaskActions();
    // `isPending` only renders a tick after the click, so a fast double click would still submit twice.
    const isSubmitting = useRef(false);

    const handleFinish = (values: CreateTaskBody) => {
        if (isSubmitting.current)
            return;

        isSubmitting.current = true;
        createTask.mutate(values, {
            onSuccess: onClose,
            onSettled: () => {
                isSubmitting.current = false;
            },
        });
    };

    return (
        <Modal
            title="New task"
            okText="Create"
            open={isOpen}
            confirmLoading={createTask.isPending}
            onOk={() => form.submit()}
            onCancel={onClose}
            afterClose={() => form.resetFields()}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true, whitespace: true, message: 'Title is required' }]}
                >
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
}
