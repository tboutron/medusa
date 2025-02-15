import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import {
  CreatePriceListDTO,
  CreatePriceListWorkflowInputDTO,
  IPricingModuleService,
} from "@medusajs/types"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"

type WorkflowStepInput = {
  data: CreatePriceListWorkflowInputDTO[]
  variant_price_map: Record<string, string>
}

export const createPriceListsStepId = "create-price-lists"
export const createPriceListsStep = createStep(
  createPriceListsStepId,
  async (stepInput: WorkflowStepInput, { container }) => {
    const { data, variant_price_map: variantPriceMap } = stepInput

    const pricingModule = container.resolve<IPricingModuleService>(
      ModuleRegistrationName.PRICING
    )

    const createData = data.map((priceListDTO) => {
      const { prices = [], ...rest } = priceListDTO
      const createPriceListData: CreatePriceListDTO = { ...rest }

      createPriceListData.prices = prices.map((price) => ({
        currency_code: price.currency_code,
        amount: price.amount,
        min_quantity: price.min_quantity,
        max_quantity: price.max_quantity,
        price_set_id: variantPriceMap[price.variant_id],
        rules: price.rules,
      }))

      return createPriceListData
    })

    const createdPriceLists = await pricingModule.createPriceLists(createData)

    return new StepResponse(
      createdPriceLists,
      createdPriceLists.map((createdPriceLists) => createdPriceLists.id)
    )
  },
  async (createdPriceListIds, { container }) => {
    if (!createdPriceListIds?.length) {
      return
    }

    const pricingModule = container.resolve<IPricingModuleService>(
      ModuleRegistrationName.PRICING
    )

    await pricingModule.deletePriceLists(createdPriceListIds)
  }
)
