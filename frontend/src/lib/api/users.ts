import { api } from './client';
import type { CreateUserInput, UpdateUserInput, User } from '$lib/types/user';

export function createUser(input: CreateUserInput): Promise<User> {
	return api.post<User>('/users', input);
}

export function listUsers(): Promise<User[]> {
	return api.get<User[]>('/users');
}

export function getUser(id: string): Promise<User> {
	return api.get<User>(`/users/${encodeURIComponent(id)}`);
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
	return api.put<User>(`/users/${encodeURIComponent(id)}`, input);
}

export function deleteUser(id: string): Promise<void> {
	return api.delete(`/users/${encodeURIComponent(id)}`);
}
