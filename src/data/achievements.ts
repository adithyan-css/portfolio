/**
 * Awards and certifications. The current résumé lists none, so these are empty
 * and their UI stays hidden. Add entries and the "Credentials" block renders itself.
 */
export type Credential = { title: string; issuer: string; year?: string; href?: string }

export const achievements: Credential[] = []
export const certifications: Credential[] = []
