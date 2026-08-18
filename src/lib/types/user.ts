export type UserRole = 'admin' | 'user' | 'guest';

export const USER_ROLES: readonly UserRole[] = ['admin', 'user', 'guest'];

export interface User {
	id: string; // server-generated (UUID). Read-only in the UI.
	name: string;
	email: string;
	role: UserRole;
	createdAt: string; // ISO 8601. server-generated. Read-only in the UI.
}

// Fields the user can submit when creating.
export interface CreateUserInput {
	name: string;
	email: string;
	role: UserRole;
}

// PUT is a full replace of the editable fields.
export type UpdateUserInput = CreateUserInput;
