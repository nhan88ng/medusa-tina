import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies-vn",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => ({
              currency_code: currency.currency_code,
              is_default: currency.is_default ?? false,
            })
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  }
);

export default async function seedVnHandbags({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["vn"];

  logger.info("Seeding VN handbag store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "vnd",
          is_default: true,
        },
        {
          currency_code: "usd",
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding VN region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Viet Nam",
          currency_code: "vnd",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding VN region.");

  logger.info("Seeding VN tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding VN tax regions.");

  logger.info("Seeding VN stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Kho Ha Noi",
          address: {
            city: "Ha Noi",
            country_code: "VN",
            address_1: "123 Cau Giay, Cau Giay",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding VN fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Giao hang Viet Nam",
    type: "shipping",
    service_zones: [
      {
        name: "Viet Nam",
        geo_zones: [
          {
            country_code: "vn",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Giao hang tieu chuan",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Tieu chuan",
          description: "Giao hang trong 3-5 ngay.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "vnd",
            amount: 30000,
          },
          {
            currency_code: "usd",
            amount: 2,
          },
          {
            region_id: region.id,
            amount: 30000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Giao hang nhanh",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Nhanh",
          description: "Giao hang trong 1-2 ngay.",
          code: "express",
        },
        prices: [
          {
            currency_code: "vnd",
            amount: 50000,
          },
          {
            currency_code: "usd",
            amount: 3,
          },
          {
            region_id: region.id,
            amount: 50000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding VN fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding VN stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding VN handbag product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Tui xach nu",
          is_active: true,
        },
        {
          name: "Tui deo cheo",
          is_active: true,
        },
        {
          name: "Ba lo",
          is_active: true,
        },
        {
          name: "Vi cam tay",
          is_active: true,
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Tui xach tay da cao cap",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Tui xach nu")!.id,
          ],
          description:
            "Tui xach tay bang da that cao cap, thiet ke sang trong va tinh te. Phu hop di lam, di choi va du tiec.",
          handle: "tui-xach-tay-da-cao-cap",
          weight: 600,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
            },
          ],
          options: [
            {
              title: "Mau sac",
              values: ["Den", "Nau", "Be"],
            },
          ],
          variants: [
            {
              title: "Den",
              sku: "TX-TAY-DEN",
              options: { "Mau sac": "Den" },
              prices: [
                { amount: 1250000, currency_code: "vnd" },
                { amount: 52, currency_code: "usd" },
              ],
            },
            {
              title: "Nau",
              sku: "TX-TAY-NAU",
              options: { "Mau sac": "Nau" },
              prices: [
                { amount: 1250000, currency_code: "vnd" },
                { amount: 52, currency_code: "usd" },
              ],
            },
            {
              title: "Be",
              sku: "TX-TAY-BE",
              options: { "Mau sac": "Be" },
              prices: [
                { amount: 1350000, currency_code: "vnd" },
                { amount: 56, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Tui deo cheo mini",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Tui deo cheo")!.id,
          ],
          description:
            "Tui deo cheo mini nho gon, tien loi cho viec di lai hang ngay. Chat lieu vai canvas ben dep.",
          handle: "tui-deo-cheo-mini",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
            },
          ],
          options: [
            {
              title: "Mau sac",
              values: ["Den", "Xanh navy", "Xam"],
            },
          ],
          variants: [
            {
              title: "Den",
              sku: "TDC-MINI-DEN",
              options: { "Mau sac": "Den" },
              prices: [
                { amount: 450000, currency_code: "vnd" },
                { amount: 19, currency_code: "usd" },
              ],
            },
            {
              title: "Xanh navy",
              sku: "TDC-MINI-XANH",
              options: { "Mau sac": "Xanh navy" },
              prices: [
                { amount: 450000, currency_code: "vnd" },
                { amount: 19, currency_code: "usd" },
              ],
            },
            {
              title: "Xam",
              sku: "TDC-MINI-XAM",
              options: { "Mau sac": "Xam" },
              prices: [
                { amount: 450000, currency_code: "vnd" },
                { amount: 19, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Ba lo da thoi trang",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Ba lo")!.id,
          ],
          description:
            "Ba lo da thoi trang, nhieu ngan tien dung. Thich hop di hoc, di lam va di du lich.",
          handle: "ba-lo-da-thoi-trang",
          weight: 800,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
            },
          ],
          options: [
            {
              title: "Mau sac",
              values: ["Den", "Nau bo"],
            },
            {
              title: "Kich thuoc",
              values: ["Nho", "Lon"],
            },
          ],
          variants: [
            {
              title: "Nho / Den",
              sku: "BL-NHO-DEN",
              options: { "Mau sac": "Den", "Kich thuoc": "Nho" },
              prices: [
                { amount: 890000, currency_code: "vnd" },
                { amount: 37, currency_code: "usd" },
              ],
            },
            {
              title: "Nho / Nau bo",
              sku: "BL-NHO-NAU",
              options: { "Mau sac": "Nau bo", "Kich thuoc": "Nho" },
              prices: [
                { amount: 890000, currency_code: "vnd" },
                { amount: 37, currency_code: "usd" },
              ],
            },
            {
              title: "Lon / Den",
              sku: "BL-LON-DEN",
              options: { "Mau sac": "Den", "Kich thuoc": "Lon" },
              prices: [
                { amount: 1050000, currency_code: "vnd" },
                { amount: 44, currency_code: "usd" },
              ],
            },
            {
              title: "Lon / Nau bo",
              sku: "BL-LON-NAU",
              options: { "Mau sac": "Nau bo", "Kich thuoc": "Lon" },
              prices: [
                { amount: 1050000, currency_code: "vnd" },
                { amount: 44, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Vi cam tay nu da PU",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Vi cam tay")!.id,
          ],
          description:
            "Vi cam tay nu bang da PU mem mai, nhieu ngan dung the va tien. Thiet ke thanh lich phu hop moi dip.",
          handle: "vi-cam-tay-nu-da-pu",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
            },
          ],
          options: [
            {
              title: "Mau sac",
              values: ["Hong", "Den", "Do"],
            },
          ],
          variants: [
            {
              title: "Hong",
              sku: "VCT-HONG",
              options: { "Mau sac": "Hong" },
              prices: [
                { amount: 350000, currency_code: "vnd" },
                { amount: 15, currency_code: "usd" },
              ],
            },
            {
              title: "Den",
              sku: "VCT-DEN",
              options: { "Mau sac": "Den" },
              prices: [
                { amount: 350000, currency_code: "vnd" },
                { amount: 15, currency_code: "usd" },
              ],
            },
            {
              title: "Do",
              sku: "VCT-DO",
              options: { "Mau sac": "Do" },
              prices: [
                { amount: 380000, currency_code: "vnd" },
                { amount: 16, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });
  logger.info("Finished seeding VN handbag product data.");

  logger.info("Seeding inventory levels...");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 500,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels.");
  logger.info("VN handbag seed completed successfully!");
}
