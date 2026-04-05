import { CreateInventoryLevelInput, ExecArgs, RuleOperatorType } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import { BRAND_MODULE } from "../modules/brand";
import BrandModuleService from "../modules/brand/service";
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
  updateShippingOptionsWorkflow,
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
  const regionModuleService = container.resolve(Modules.REGION);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  const productModuleService = container.resolve(Modules.PRODUCT);

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

  // --- Region (idempotent) ---
  logger.info("Seeding VN region data...");
  const { data: regionsWithVn } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    filters: { countries: { iso_2: "vn" } },
  });
  let region;
  const requiredPaymentProviders = ["pp_system_default", "pp_cod_cod", "pp_bank-transfer_bank-transfer"];

  if (regionsWithVn.length) {
    region = regionsWithVn[0];
    logger.info(`Region with country VN already exists ('${region.name}'), ensuring payment providers are linked...`);

    // Re-link payment providers (they can be lost after db:migrate / redeploy)
    const { data: regionWithProviders } = await query.graph({
      entity: "region",
      fields: ["payment_providers.*"],
      filters: { id: region.id },
    });
    const existingProviderIds = new Set(
      (regionWithProviders[0]?.payment_providers || []).map((p: any) => p.id)
    );
    for (const providerId of requiredPaymentProviders) {
      if (!existingProviderIds.has(providerId)) {
        logger.info(`Linking payment provider '${providerId}' to region '${region.name}'...`);
        await link.create({
          [Modules.REGION]: { region_id: region.id },
          [Modules.PAYMENT]: { payment_provider_id: providerId },
        });
      }
    }
    logger.info("Payment providers ensured.");
  } else {
    const { result: regionResult } = await createRegionsWorkflow(
      container
    ).run({
      input: {
        regions: [
          {
            name: "Viet Nam",
            currency_code: "vnd",
            countries,
            payment_providers: requiredPaymentProviders,
          },
        ],
      },
    });
    region = regionResult[0];
  }
  logger.info("Finished seeding VN region.");

  // --- Tax regions (idempotent) ---
  logger.info("Seeding VN tax regions...");
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: { country_code: "vn" },
  });
  if (existingTaxRegions.length) {
    logger.info("Tax region for VN already exists, skipping.");
  } else {
    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  }
  logger.info("Finished seeding VN tax regions.");

  // --- Stock location (idempotent) ---
  logger.info("Seeding VN stock location data...");
  const existingLocations = await stockLocationModuleService.listStockLocations({
    name: "Kho HCM",
  });
  let stockLocation;
  if (existingLocations.length) {
    stockLocation = existingLocations[0];
    logger.info("Stock location 'Kho HCM' already exists, skipping.");
  } else {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "Kho HCM",
            address: {
              city: "Ho Chi Minh",
              country_code: "VN",
              address_1: "Hau Giang, Phuong Binh Phu, HCM",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];

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
  }

  // --- Fulfillment (idempotent) ---
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

  // Shipping config from ENV
  const shippingStandardPrice = parseInt(
    process.env.SHIPPING_STANDARD_PRICE || "30000"
  );
  const shippingExpressPrice = parseInt(
    process.env.SHIPPING_EXPRESS_PRICE || "50000"
  );
  const freeShipStandardThreshold = parseInt(
    process.env.FREE_SHIP_STANDARD_THRESHOLD || "300000"
  );
  const freeShipExpressThreshold = parseInt(
    process.env.FREE_SHIP_EXPRESS_THRESHOLD || "500000"
  );

  // Helper: build prices array with optional freeship rule
  const buildPrices = (basePrice: number, freeThreshold: number, regionId: string) => {
    const prices: any[] = [
      { currency_code: "vnd", amount: basePrice },
      { region_id: regionId, amount: basePrice },
    ];
    if (freeThreshold > 0) {
      prices.push(
        {
          currency_code: "vnd",
          amount: 0,
          rules: [{ attribute: "item_total", operator: "gte" as RuleOperatorType, value: freeThreshold }],
        },
        {
          region_id: regionId,
          amount: 0,
          rules: [{ attribute: "item_total", operator: "gte" as RuleOperatorType, value: freeThreshold }],
        }
      );
    }
    return prices;
  };

  // Check zones AND shipping option counts to avoid unnecessary recreation.
  // Expected: "Giao hàng toàn quốc" (1 option) + "Giao hàng TP.HCM" (2 options).
  const existingZones = await fulfillmentModuleService.listServiceZones({
    name: ["Giao hàng toàn quốc", "Giao hàng TP.HCM"],
  });
  const zoneToanQuocExisting = existingZones.find((z) => z.name === "Giao hàng toàn quốc");
  const zoneHCMExisting = existingZones.find((z) => z.name === "Giao hàng TP.HCM");

  let hasCorrectStructure = false;
  if (zoneToanQuocExisting && zoneHCMExisting) {
    const optionsToanQuoc = await fulfillmentModuleService.listShippingOptions({
      service_zone: { id: [zoneToanQuocExisting.id] },
    });
    const optionsHCM = await fulfillmentModuleService.listShippingOptions({
      service_zone: { id: [zoneHCMExisting.id] },
    });
    // Correct: toan quoc has 1 option, HCM has 2 options (standard + express)
    hasCorrectStructure = optionsToanQuoc.length === 1 && optionsHCM.length === 2;
  }

  let fulfillmentSet;
  if (hasCorrectStructure) {
    logger.info("Shipping zones already configured correctly, skipping.");
  } else {
    // Cleanup old fulfillment set if exists (e.g. from previous seed with different structure)
    const oldFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
      name: ["Giao hàng Việt Nam", "Giao hang Viet Nam"],
    });
    if (oldFulfillmentSets.length) {
      logger.info("Old shipping structure detected — migrating to 2-zone structure...");
      const oldSet = oldFulfillmentSets[0];

      // 1. Delete old shipping options first (they reference service zones)
      const oldServiceZones = await fulfillmentModuleService.listServiceZones({
        fulfillment_set: { id: oldSet.id },
      });
      if (oldServiceZones.length) {
        const oldShippingOptions = await fulfillmentModuleService.listShippingOptions({
          service_zone: { id: oldServiceZones.map((z) => z.id) },
        });
        if (oldShippingOptions.length) {
          await fulfillmentModuleService.deleteShippingOptions(
            oldShippingOptions.map((o) => o.id)
          );
          logger.info(`Deleted ${oldShippingOptions.length} old shipping options.`);
        }
      }

      // 2. Dismiss ALL stock location ↔ fulfillment set links for this fulfillment set
      //    (there may be multiple locations linked from previous seed runs)
      const allLocations = await stockLocationModuleService.listStockLocations({});
      for (const loc of allLocations) {
        try {
          await link.dismiss({
            [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
            [Modules.FULFILLMENT]: { fulfillment_set_id: oldSet.id },
          });
        } catch {
          // ignore: link may not exist for this location
        }
      }

      // 3. Delete old fulfillment set (cascades to service zones and geo zones)
      await fulfillmentModuleService.deleteFulfillmentSets([oldSet.id]);
      logger.info("Deleted old fulfillment set.");
    }

    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Giao hàng Việt Nam",
      type: "shipping",
      service_zones: [
        {
          name: "Giao hàng toàn quốc",
          geo_zones: [
            {
              country_code: "vn",
              type: "country",
            },
          ],
        },
        {
          name: "Giao hàng TP.HCM",
          geo_zones: [
            {
              country_code: "vn",
              type: "province",
              province_code: "vn-sg",
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

    const serviceZones = await fulfillmentModuleService.listServiceZones({
      fulfillment_set: { id: fulfillmentSet.id },
    });
    const zoneToanQuoc = serviceZones.find(
      (z) => z.name === "Giao hàng toàn quốc"
    );
    const zoneHCM = serviceZones.find(
      (z) => z.name === "Giao hàng TP.HCM"
    );

    const shippingRules: { attribute: string; operator: RuleOperatorType; value: string }[] = [
      { attribute: "enabled_in_store", value: "true", operator: "eq" },
      { attribute: "is_return", value: "false", operator: "eq" },
    ];

    await createShippingOptionsWorkflow(container).run({
      input: [
        // Zone: Giao hàng toàn quốc — standard only
        {
          name: "Giao hàng tiêu chuẩn",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zoneToanQuoc!.id,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Tiêu Chuẩn", description: "Giao hàng trong 3-5 ngày.", code: "standard" },
          prices: buildPrices(shippingStandardPrice, freeShipStandardThreshold, region.id),
          rules: shippingRules,
        },
        // Zone: Giao hàng TP.HCM — standard + express
        {
          name: "Giao hàng tiêu chuẩn",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zoneHCM!.id,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Tiêu Chuẩn", description: "Giao hàng trong 3-5 ngày.", code: "standard" },
          prices: buildPrices(shippingStandardPrice, freeShipStandardThreshold, region.id),
          rules: shippingRules,
        },
        {
          name: "Giao hàng hoả tốc",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zoneHCM!.id,
          shipping_profile_id: shippingProfile.id,
          type: { label: "Hoả Tốc", description: "Giao hàng trong vòng 4 giờ (chỉ áp dụng tại TP.HCM).", code: "express" },
          prices: buildPrices(shippingExpressPrice, freeShipExpressThreshold, region.id),
          rules: shippingRules,
        },
      ],
    });

    // Workflow always creates new type records — deduplicate by code.
    // List all types, keep first per code (canonical), delete duplicates.
    // For options using a duplicate type, remap them to canonical using shipping_option_type_id.
    const allTypes = await fulfillmentModuleService.listShippingOptionTypes({});
    const allOptions = await fulfillmentModuleService.listShippingOptions({});
    const typeById = new Map(allTypes.map((t) => [t.id, t]));
    const canonicalByCode = new Map<string, string>(); // code → canonical type id

    // Sort so newest types (from this seed run) are canonical — orphaned old types become duplicates
    const optionTypeIds = new Set(
      allOptions.map((o) => (o as any).shipping_option_type_id as string).filter(Boolean)
    );
    // Prioritize types that are actually used by options
    const sortedTypes = [
      ...allTypes.filter((t) => optionTypeIds.has(t.id)),
      ...allTypes.filter((t) => !optionTypeIds.has(t.id)),
    ];

    const duplicateTypeIds: string[] = [];
    for (const t of sortedTypes) {
      if (!canonicalByCode.has(t.code)) {
        canonicalByCode.set(t.code, t.id);
      } else {
        duplicateTypeIds.push(t.id);
      }
    }

    if (duplicateTypeIds.length) {
      for (const opt of allOptions) {
        const typeId = (opt as any).shipping_option_type_id as string | undefined;
        if (typeId && duplicateTypeIds.includes(typeId)) {
          const dupeType = typeById.get(typeId);
          if (dupeType) {
            const canonicalId = canonicalByCode.get(dupeType.code)!;
            // Use shipping_option_type_id directly to update FK without creating new type
            await fulfillmentModuleService.updateShippingOptions(
              opt.id,
              { shipping_option_type_id: canonicalId } as any
            );
          }
        }
      }
      await fulfillmentModuleService.deleteShippingOptionTypes(duplicateTypeIds);
      logger.info(`Deduplicated ${duplicateTypeIds.length} shipping option type(s).`);
    }
  }

  // --- Ensure freeship rules exist on all shipping options ---
  // Runs regardless of whether we just created or skipped the structure.
  // Catches cases where options were manually recreated via Admin UI without freeship rules.
  const currentZones = await fulfillmentModuleService.listServiceZones({
    name: ["Giao hàng toàn quốc", "Giao hàng TP.HCM"],
  });
  const zoneToanQuocCurrent = currentZones.find((z) => z.name === "Giao hàng toàn quốc");
  const zoneHCMCurrent = currentZones.find((z) => z.name === "Giao hàng TP.HCM");

  if (zoneToanQuocCurrent && zoneHCMCurrent) {
    const { data: optionsWithPrices } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "name", "prices.*"],
      filters: {
        service_zone_id: [zoneToanQuocCurrent.id, zoneHCMCurrent.id],
      },
    });

    let freeshipUpdated = 0;
    for (const opt of optionsWithPrices as any[]) {
      const hasFreeship = (opt.prices || []).some((p: any) => p.amount === 0);
      if (!hasFreeship) {
        const isExpress = opt.name === "Giao hàng hoả tốc";
        const basePrice = isExpress ? shippingExpressPrice : shippingStandardPrice;
        const threshold = isExpress ? freeShipExpressThreshold : freeShipStandardThreshold;
        await updateShippingOptionsWorkflow(container).run({
          input: [{ id: opt.id, prices: buildPrices(basePrice, threshold, region.id) }],
        });
        freeshipUpdated++;
        logger.info(`Added freeship rules to "${opt.name}".`);
      }
    }
    if (freeshipUpdated === 0) {
      logger.info("Freeship rules already present on all shipping options.");
    } else {
      logger.info(`Updated freeship rules on ${freeshipUpdated} shipping option(s).`);
    }
  }

  logger.info("Finished seeding VN fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding VN stock location data.");

  // --- Publishable API key (idempotent) ---
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

  // --- Brands (idempotent) ---
  logger.info("Seeding brand data...");
  const brandService: BrandModuleService = container.resolve(BRAND_MODULE);

  const existingBrands = await brandService.listBrands();
  let tinaLeather, vietBag, lumi;

  if (existingBrands.length) {
    tinaLeather = existingBrands.find((b) => b.name === "Tina Leather")!;
    vietBag = existingBrands.find((b) => b.name === "Viet Bag")!;
    lumi = existingBrands.find((b) => b.name === "Lumi")!;
    logger.info("Brands already exist, skipping.");
  } else {
    const brands = await brandService.createBrands([
      {
        name: "Tina Leather",
        description: "Thuong hieu tui xach da cao cap Viet Nam",
      },
      {
        name: "Viet Bag",
        description: "Tui xach thoi trang gia re, chat luong tot",
      },
      {
        name: "Lumi",
        description: "Thuong hieu ba lo va phu kien thoi trang",
      },
    ]);

    tinaLeather = brands.find((b) => b.name === "Tina Leather")!;
    vietBag = brands.find((b) => b.name === "Viet Bag")!;
    lumi = brands.find((b) => b.name === "Lumi")!;
  }
  logger.info("Finished seeding brand data.");

  // --- Products (idempotent) ---
  logger.info("Seeding VN handbag product data...");
  const existingProducts = await productModuleService.listProducts({
    handle: "tui-xach-tay-da-cao-cap",
  });

  let productResult;

  if (existingProducts.length) {
    logger.info("Products already exist, skipping.");
    productResult = await productModuleService.listProducts();
  } else {
    // Categories
    const existingCategories =
      await productModuleService.listProductCategories({
        name: ["Tui xach nu", "Tui deo cheo", "Ba lo", "Vi cam tay"],
      });

    let categoryResult;
    if (existingCategories.length >= 4) {
      categoryResult = existingCategories;
      logger.info("Product categories already exist, skipping.");
    } else {
      const { result } = await createProductCategoriesWorkflow(container).run({
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
      categoryResult = result;
    }

    const { result } = await createProductsWorkflow(container).run({
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
    productResult = result;
  }
  logger.info("Finished seeding VN handbag product data.");

  // --- Link products to brands ---
  logger.info("Linking products to brands...");
  const allProducts = await productModuleService.listProducts();
  const productBrandMap = [
    { handle: "tui-xach-tay-da-cao-cap", brand: tinaLeather },
    { handle: "tui-deo-cheo-mini", brand: vietBag },
    { handle: "ba-lo-da-thoi-trang", brand: lumi },
    { handle: "vi-cam-tay-nu-da-pu", brand: tinaLeather },
  ];

  for (const { handle, brand } of productBrandMap) {
    const product = allProducts.find((p) => p.handle === handle);
    if (product && brand) {
      try {
        await link.create({
          [Modules.PRODUCT]: { product_id: product.id },
          [BRAND_MODULE]: { brand_id: brand.id },
        });
      } catch (e) {
        // Link might already exist
        logger.info(`Link for ${handle} might already exist, skipping.`);
      }
    }
  }
  logger.info("Finished linking products to brands.");

  // --- Inventory levels ---
  logger.info("Seeding inventory levels...");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const { data: existingLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id"],
  });

  if (existingLevels.length) {
    logger.info("Inventory levels already exist, skipping.");
  } else {
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
  }

  logger.info("Finished seeding inventory levels.");
  logger.info("VN handbag seed completed successfully!");
}
