

export class Category {
  constructor(
    public id: string,
    public name: string,
    public description?: string,
    public parentCategory?: Category // 🟢 Self-reference for nesting
  ) {}

  // Optional: full path like "General > Fertilizers"
  getFullPath(): string {
    return this.parentCategory
      ? `${this.parentCategory.getFullPath()} > ${this.name}`
      : this.name
  }

  // Optional: check if this is a root-level category
  isRoot(): boolean {
    return !this.parentCategory
  }
}
