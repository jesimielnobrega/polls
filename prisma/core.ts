import { randomUUID } from "node:crypto";

export class Core {
  private _id: string;

  get id() {
    return this._id;
  }

  set id(id) {
    this.id = id;
  }

  constructor(id: string | undefined) {
    this._id = !id ? randomUUID() : id;
  }
}
