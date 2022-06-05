export class GentleError extends Error {
  constructor(public readonly gentleMessage: string) {
    super(gentleMessage);
  }
}
