
import { FPO } from "../entities/fpo";
export interface IFPORepository {
  save(fpo: FPO): Promise<void>;
  findById(id: string): Promise<FPO | null>;
  update(fpo: FPO): Promise<void>;
}
