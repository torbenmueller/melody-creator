export interface User {
	email: string;
	userId: string;
	plan?: string;
	// allow other fields without losing typing for the known ones
	[key: string]: any;
}
