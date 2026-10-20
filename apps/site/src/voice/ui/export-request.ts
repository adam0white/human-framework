/** One export belongs to one run generation. Reset invalidates both the worker reply and its build fetch. */
export class ExportRequest {
  private generation: number | null = null;
  private toLab = false;
  private serial = 0;
  private active = 0;

  begin(generation: number, toLab: boolean): boolean {
    if (this.generation !== null) return false;
    this.generation = generation;
    this.toLab = toLab;
    this.active = ++this.serial;
    return true;
  }

  ticket(generation: number): number | null {
    return this.current(generation) ? this.active : null;
  }

  current(generation: number): boolean {
    return this.generation === generation;
  }

  destination(generation: number): boolean {
    return this.current(generation) && this.toLab;
  }

  finish(generation: number, ticket = this.active): boolean {
    if (!this.current(generation) || ticket !== this.active) return false;
    this.reset();
    return true;
  }

  reset(): void {
    this.generation = null;
    this.toLab = false;
  }
}
