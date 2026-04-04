import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import BankTransferPaymentService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [BankTransferPaymentService],
})
