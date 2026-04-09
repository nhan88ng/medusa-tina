import { createStep, StepResponse, createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { fetchNhanhProductList, fetchNhanhProductDetail, fetchNhanhCategories, fetchNhanhBrands } from "../lib/nhanh";
import { createProductsWorkflow, updateProductsWorkflow, createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ENTITY_CONTENT_MODULE } from "../modules/entity-content";

// --- STEP: Sync Categories ---
export const syncNhanhCategoriesStep = createStep("sync-nhanh-cats", async (input: void, { container }) => {
   const cats = await fetchNhanhCategories();
   const productModule = container.resolve(Modules.PRODUCT);
   
   const idMap: Record<number, string> = {};

   const toCreate: any[] = [];
   const toUpdate: any[] = [];

   // Function to generate a basic slug (matching Medusa's internal style)
   const slugify = (text: string) => {
       const a = 'àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;';
       const b = 'aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------';
       const p = new RegExp(a.split('').join('|'), 'g');
       return text.toString().toLowerCase()
           .replace(/\s+/g, '-')
           .replace(p, c => b.charAt(a.indexOf(c)))
           .replace(/&/g, '-and-')
           .replace(/[^\w\-]+/g, '')
           .replace(/\-\-+/g, '-')
           .replace(/^-+/, '').replace(/-+$/, '');
   };

   for (const c of cats) {
       // Nhanh sometimes has empty 'code', or random acronyms.
       // The handle should either be the rigorous Nhanh code or a smart slugified name!
       let handle = c.code ? String(c.code).toLowerCase().replace(/[^a-z0-9]/g, '-') : slugify(c.name || `cat-${c.id}`);
       const cleanName = c.name ? String(c.name).toLowerCase().trim() : "";
       
       const mapMeta = { 
           source: "nhanh", 
           nhanh_id: c.id, 
           image_url: c.image || null,
           content: c.content || null
       };
       const description = c.content?.replace(/<[^>]*>?/gm, '') || c.name;

       // 1. Direct DB probe for handle
       const existingByHandle = await productModule.listProductCategories({ handle: handle });
       // 2. Direct DB probe for Nhanh's generated Handle if it was generated natively by Medusa
       const systemHandle = slugify(c.name || "");
       const existingBySysHandle = systemHandle ? await productModule.listProductCategories({ handle: systemHandle }) : [];
       
       // Priority Match
       let matchedCat: any = null;
       
       // If we've already matched in loop
       if (idMap[c.id]) {
            // Already queued, handled inside loop map
       } else if (existingByHandle.length > 0) {
           matchedCat = existingByHandle[0];
       } else if (existingBySysHandle.length > 0) {
           matchedCat = existingBySysHandle[0];
       } else {
           // 3. Fallback: Query by name using q parameter
           const existingByName = await productModule.listProductCategories({ q: c.name });
           if (existingByName.length > 0) {
               matchedCat = existingByName.find(x => x.name.toLowerCase() === cleanName);
           }
       }

       if (matchedCat) {
           idMap[c.id] = matchedCat.id;
           // ONLY update metadata Nhanh relation, do NOT touch name, description, etc.
           toUpdate.push({
               id: matchedCat.id,
               metadata: { ...matchedCat.metadata, source: "nhanh", nhanh_id: c.id }
           });
       } else {
           // Use systemHandle as it is standard Medusa convention if code is not provided cleanly
           const finalHandle = handle || systemHandle || `cat-${c.id}`;
           toCreate.push({
               name: c.name || "Unknown",
               handle: finalHandle,
               is_active: true,
               is_internal: false,
               metadata: mapMeta
           });
       }
   }

   if (toCreate.length > 0) {
       const created = await productModule.createProductCategories(toCreate);
       created.forEach(c => {
           if (c.metadata?.nhanh_id) idMap[c.metadata.nhanh_id as number] = c.id;
       });
   }
   
   if (toUpdate.length > 0) {
       for (const u of toUpdate) {
           const { id, ...data } = u;
           await productModule.updateProductCategories(id, data);
       }
   }
   
   // 4. Second Pass: Link Nested Parents safely
   // Now that idMap is fully populated, we can map parents without recursive dependencies.
   const parentUpdates: any[] = [];
   for (const c of cats) {
       if (c.parentId && c.parentId > 0 && idMap[c.parentId] && idMap[c.id]) {
           parentUpdates.push({
               id: idMap[c.id],
               parent_category_id: idMap[c.parentId]
           });
       }
   }

   if (parentUpdates.length > 0) {
       for (const pUpdate of parentUpdates) {
           await productModule.updateProductCategories(pUpdate.id, { parent_category_id: pUpdate.parent_category_id });
       }
   }
   
   return new StepResponse({ categoryMap: idMap });
});

// --- STEP: Sync Brands ---
export const syncNhanhBrandsStep = createStep("sync-nhanh-brands", async (input: void, { container }) => {
   const brands = await fetchNhanhBrands();
   let brandModule;
   try {
       brandModule = container.resolve("brand");
   } catch {
       console.log("[Sync] Brand module not found, skipping brand sync.");
       return new StepResponse({ brandMap: {} });
   }
   
   const idMap: Record<number, string> = {}; 

   const slugify = (text: string) => {
       const a = 'àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;';
       const b = 'aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------';
       const p = new RegExp(a.split('').join('|'), 'g');
       return text.toString().toLowerCase()
           .replace(/\s+/g, '-')
           .replace(p, c => b.charAt(a.indexOf(c)))
           .replace(/&/g, '-and-')
           .replace(/[^\w\-]+/g, '')
           .replace(/\-\-+/g, '-')
           .replace(/^-+/, '').replace(/-+$/, '');
   };

   for (const b of brands) {
       const cleanName = String(b.name).toLowerCase();
       const handle = slugify(b.name || `brand-${b.id}`);
       const description = b.description || b.content?.replace(/<[^>]*>?/gm, '') || "";
       const content = b.content || "";
       const logo = b.image || b.logo || null;

       let matchedModel: any = null;
       
       // Try DB by Name (since Brand schema has no deep q filter, we can list all or query by handle)
       const existingByHandle = await brandModule.listBrands({ handle: handle });
       if (existingByHandle.length > 0) {
           matchedModel = existingByHandle[0];
       } else {
           // fallback brute array scan if necessary for absolute perfect match
           const allB = await brandModule.listBrands({}, { take: 2000 });
           matchedModel = allB.find((db: any) => db.name && String(db.name).toLowerCase().trim() === cleanName.trim());
       }

       if (matchedModel) {
           idMap[b.id] = matchedModel.id;
           // We ONLY link the ID without updating existing names/descriptions
       } else {
           const created = await brandModule.createBrands({
               name: b.name,
               handle: handle
           });
           idMap[b.id] = created.id;
       }
   }
   
   return new StepResponse({ brandMap: idMap });
});

// --- STEP: Fetch and Format ---
export const fetchAndProcessNhanhProductsStep = createStep(
  "fetch-process-nhanh-products",
  async (input: { categoryMap: Record<number, string>, brandMap: Record<number, string> }, { container }) => {
    
    const { categoryMap, brandMap } = input;

    // FETCH SALES CHANNEL DEFAULT
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
    const channels = await salesChannelModule.listSalesChannels({}, { take: 1 });
    const defaultSalesChannelId = channels.length > 0 ? channels[0].id : null;

    const allList = await fetchNhanhProductList();
    const parentsList = allList.filter((p: any) => p.parentId === -1 || p.parentId === -2);

    // Build variants map from list API: parentId -> variant items[]
    // Nhanh returns products and variants in the same list.
    // Variants have parentId = product's id.
    const variantsByParentId: Record<string, any[]> = {};
    allList.forEach((item: any) => {
        const pid = Number(item.parentId);
        if (pid > 0) {
            const key = String(pid);
            if (!variantsByParentId[key]) variantsByParentId[key] = [];
            variantsByParentId[key].push(item);
        }
    });

    const processedProducts: any[] = [];
    const skuToQuantityMap: Record<string, number> = {};
    const globalUniqueSkus = new Set<string>();

    for (const p of parentsList) {
       console.log(`[Sync] Fetching detail for Product ID: ${p.id} (${p.name})`);
       const detail = await fetchNhanhProductDetail(p.id);
       if (!detail) continue;

       const isStandalone = detail.parentId === -1;
       const contentHtml = detail.content || "";

       // Get variants from list API (more complete data, especially images)
       // Fallback to detail.childs if list API doesn't have them
       const childs = isStandalone ? [] : (variantsByParentId[String(p.id)] || detail.childs || []);

       // Collect all images: product avatar + others + each variant's avatar
       // Nhanh API uses { images: { avatar: "url", others: ["url",...] } }
       const productImagesSet = new Set<string>();
       if (detail.images?.avatar) productImagesSet.add(detail.images.avatar);
       if (detail.images?.others) {
           detail.images.others.forEach((url: string) => { if (url) productImagesSet.add(url); });
       }

       childs.forEach((c: any) => {
           if (c.images?.avatar) productImagesSet.add(c.images.avatar);
           if (c.images?.others) {
               c.images.others.forEach((url: string) => { if (url) productImagesSet.add(url); });
           }
       });

       const imageArray = Array.from(productImagesSet).map(url => ({ url }));
       const imageObj = imageArray.length > 0 ? imageArray : undefined;

       // Nhanh status: 2 = Đang bán (Active) → published
       const nhanhStatus = Number(detail.status);
       const isPublished = nhanhStatus === 2;

       const medusaProduct: any = {
          external_id: `nhanh-${detail.id}`,
          title: detail.name || "Sản phẩm",
          description: contentHtml.replace(/<[^>]*>?/gm, '') || detail.description || "",
          metadata: {
             source: "nhanh",
             nhanh_id: detail.id,
             nhanh_code: detail.code,
             nhanh_content_html: contentHtml || undefined,
          },
          images: imageObj,
          thumbnail: detail.images?.avatar || undefined,
          weight: Math.abs(Number(detail.shippingWeight)) || 0,
          options: [],
          variants: [],
          status: isPublished ? "published" : "draft",
          category_ids: detail.categoryId && categoryMap[detail.categoryId] ? [categoryMap[detail.categoryId]] : [],
          mappedBrandId: detail.brandId && brandMap[detail.brandId] ? brandMap[detail.brandId] : null,
          defaultSalesChannelId: defaultSalesChannelId // Passing channel down for linking
       };
       
       if (defaultSalesChannelId) {
          medusaProduct.sales_channels = [{ id: defaultSalesChannelId }];
       }
       
       if (isStandalone) {
          let sku = detail.code ? String(detail.code).trim() : `nhanh-${detail.id}`;
          if (globalUniqueSkus.has(sku.toUpperCase())) sku = `${sku}-${detail.id}`;
          globalUniqueSkus.add(sku.toUpperCase());

          medusaProduct.options = [{ title: "Default", values: ["Default"] }];
          medusaProduct.variants = [{
             title: "Default",
             sku: sku,
             manage_inventory: true,
             allow_backorder: false,
             prices: [
                { amount: Number(detail.prices?.retail) || 0, currency_code: "vnd" }
             ],
             options: { "Default": "Default" }
          }];
          skuToQuantityMap[sku] = Number(detail.inventory?.available) || 0;
       } else {
          // childs already set above from list API (or detail.childs fallback)
          const optionsMap: Record<string, Set<string>> = {};
          
          childs.forEach((c: any) => {
             if (!c.attributes || c.attributes.length === 0) {
                 if (!optionsMap["Phân loại"]) optionsMap["Phân loại"] = new Set<string>();
                 optionsMap["Phân loại"].add(c.name || "Default");
             } else {
                 c.attributes.forEach((attr: any) => {
                     if (!optionsMap[attr.name]) optionsMap[attr.name] = new Set<string>();
                     if (attr.value) optionsMap[attr.name].add(String(attr.value).trim() || "N/A");
                 });
             }
          });
          
          const optionNames = Object.keys(optionsMap);
          if (optionNames.length === 0) {
             optionsMap["Custom"] = new Set(["Default"]);
             optionNames.push("Custom");
          }
          
          optionNames.forEach(name => {
             medusaProduct.options.push({ title: name, values: Array.from(optionsMap[name]) });
          });
          
          childs.forEach((c: any) => {
             const variantOptions: Record<string, string> = {};
             
             if (!c.attributes || c.attributes.length === 0) {
                 variantOptions["Phân loại"] = c.name || "Default";
             } else {
                 c.attributes.forEach((attr: any) => {
                     variantOptions[attr.name] = String(attr.value).trim() || "N/A";
                 });
             }
             
             optionNames.forEach(name => {
                 if (!variantOptions[name]) {
                     const fallbackVal = "N/A";
                     variantOptions[name] = fallbackVal;
                     const optObj = medusaProduct.options.find((o: any) => o.title === name);
                     if (optObj && !optObj.values.includes(fallbackVal)) {
                         (optObj.values as string[]).push(fallbackVal);
                     }
                 }
             });
             
             let sku = c.code ? String(c.code).trim() : `nhanh-var-${c.id}`;
             if (globalUniqueSkus.has(sku.toUpperCase())) sku = `${sku}-${c.id}`;
             globalUniqueSkus.add(sku.toUpperCase());
             
             medusaProduct.variants.push({
                title: c.name || "Default",
                sku: sku,
                manage_inventory: true,
                allow_backorder: false,
                prices: [
                   { amount: Number(c.prices?.retail) || Number(detail.prices?.retail) || 0, currency_code: "vnd" }
                ],
                options: variantOptions,
                // Variant image from Nhanh: images.avatar
                thumbnail: c.images?.avatar || undefined,
                metadata: c.images?.avatar ? { image_url: c.images.avatar } : undefined
             });
             
             skuToQuantityMap[sku] = Number(c.inventory?.available) || 0;
          });
       }
       
       processedProducts.push(medusaProduct);
    }
    
    return new StepResponse({ products: processedProducts, skuToQuantityMap });
  }
);

// --- STEP: Split Update vs Create & Map Linking ---
export const distributeMedusaProductsStep = createStep(
  "distribute-medusa-products",
  async (input: { products: any[] }, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT);
    const { products } = input;

    const externalIds = products.map((p: any) => p.external_id).filter(Boolean);
    const allSkus = products.flatMap((p: any) => p.variants ? p.variants.map((v: any) => v.sku) : []).filter(Boolean);

    // 1. Fetch by external_id
    const existingByExtId = externalIds.length > 0 
        ? await productModuleService.listProducts({ external_id: externalIds }, { relations: ["variants"], take: 5000 }) 
        : [];
        
    // 2. Fetch by exact SKUs globally
    const existingVariants = allSkus.length > 0 
        ? await productModuleService.listProductVariants({ sku: allSkus }, { relations: ["product", "product.variants"], take: 5000 }) 
        : [];

    const existingData: Record<string, any> = {};
    existingByExtId.forEach(p => {
        if (p.external_id) existingData[p.external_id] = p;
    });

    const skuToProductId: Record<string, any> = {};
    const skuToVariantId: Record<string, string> = {};
    
    existingVariants.forEach(v => {
        if (v.sku && v.product) {
            const clean = v.sku.toUpperCase().trim();
            skuToProductId[clean] = v.product;
            skuToVariantId[clean] = v.id;
        }
    });

    const created: any[] = [];
    const updated: any[] = [];
    const linkRequests: any[] = [];

    for (const mapP of products) {
        let medusaP: any = null;
        
        if (existingData[mapP.external_id]) {
            medusaP = existingData[mapP.external_id];
        } else {
            if (mapP.variants) {
                for (const v of mapP.variants) {
                    if (v.sku && skuToProductId[v.sku.toUpperCase().trim()]) {
                        medusaP = skuToProductId[v.sku.toUpperCase().trim()];
                        break;
                    }
                }
            }
        }

        if (medusaP) {
            const updatedP = { ...mapP, id: medusaP.id };

            if (updatedP.variants && updatedP.variants.length > 0) {
               updatedP.variants = updatedP.variants.map((v: any) => {
                  let matchBySku = false;
                  const cleanSku = v.sku ? String(v.sku).toUpperCase().trim() : "";
                  const cleanTitle = v.title ? String(v.title).toLowerCase().trim() : "";

                  // Absolute explicit SKU Match from Global Cache (solves nested relations dropping variants)
                  if (cleanSku && skuToVariantId[cleanSku]) {
                      return { ...v, id: skuToVariantId[cleanSku] };
                  }

                  const exVar = medusaP.variants?.find((mVar: any) => {
                      const mCleanSku = mVar.sku ? String(mVar.sku).toUpperCase().trim() : "";
                      const mCleanTitle = mVar.title ? String(mVar.title).toLowerCase().trim() : "";
                      
                      if (mCleanSku && mCleanSku === cleanSku) {
                          matchBySku = true; return true;
                      }
                      if (!matchBySku && mCleanTitle && mCleanTitle === cleanTitle) {
                          return true;
                      }
                      return false;
                  });
                  if (exVar) {
                      return { ...v, id: exVar.id }; 
                  }
                  return v; 
               });
            }

            updated.push({
                id: medusaP.id,
                title: mapP.title,
                description: mapP.description,
                status: mapP.status,
                thumbnail: mapP.thumbnail,
                images: mapP.images,
                category_ids: mapP.category_ids,
                variants: updatedP.variants
            });

            if (mapP.mappedBrandId) {
                linkRequests.push({
                   [Modules.PRODUCT]: { product_id: medusaP.id },
                   "brand": { brand_id: mapP.mappedBrandId }
                });
            }

            if (mapP.defaultSalesChannelId) {
                linkRequests.push({
                   [Modules.PRODUCT]: { product_id: medusaP.id },
                   [Modules.SALES_CHANNEL]: { sales_channel_id: mapP.defaultSalesChannelId }
                });
            }
        } else {
            created.push(mapP);
        }
    }

    console.log(`[DEBUG] toUpdate Count: ${updated.length}`);
    console.log(`[DEBUG] toCreate Count: ${created.length}`);

    return new StepResponse({ productsToCreate: created, productsToUpdate: updated, brandLinks: linkRequests });
  }
);

export const linkNewProductsBrandsStep = createStep(
  "link-new-products-brands",
  async (input: { createdProducts: any[], mappedProducts: any[] }, { container }) => {
     const { createdProducts, mappedProducts } = input;
     const linkRequests: any[] = [];
     
     // Build maps by external_id
     const brandIdsByExternalId: Record<string, string> = {};
     const channelIdsByExternalId: Record<string, string> = {};
     
     mappedProducts.forEach(p => {
         if (p.external_id) {
             if (p.mappedBrandId) brandIdsByExternalId[p.external_id] = p.mappedBrandId;
             if (p.defaultSalesChannelId) channelIdsByExternalId[p.external_id] = p.defaultSalesChannelId;
         }
     });
     
     // Add links for successfully created products
     createdProducts.forEach(cp => {
         const brandId = brandIdsByExternalId[cp.external_id];
         if (brandId) {
             linkRequests.push({
                 [Modules.PRODUCT]: { product_id: cp.id },
                 "brand": { brand_id: brandId }
             });
         }
         
         const channelId = channelIdsByExternalId[cp.external_id];
         if (channelId) {
             linkRequests.push({
                 [Modules.PRODUCT]: { product_id: cp.id },
                 [Modules.SALES_CHANNEL]: { sales_channel_id: channelId }
             });
         }
     });

     if (linkRequests.length > 0) {
        const remoteLink = container.resolve("remoteLink");
        await remoteLink.create(linkRequests);
     }
     
     return new StepResponse({ done: true });
  }
);

// Assign images to variants + set variant thumbnails
export const forceSetVariantThumbnailsStep = createStep(
  "force-set-variant-thumbnails",
  async (input: { createdProducts: any[], updatedProducts: any[], mappedProducts: any[] }, { container }) => {
     const { createdProducts, updatedProducts, mappedProducts } = input;
     const productService = container.resolve(Modules.PRODUCT);
     const remoteQuery = container.resolve("remoteQuery");

     // Build SKU -> image URL map (variant-specific image OR product thumbnail as fallback)
     const skuToImageUrl: Record<string, string> = {};
     mappedProducts.forEach((p: any) => {
         const productFallbackImage = p.thumbnail || p.images?.[0]?.url || null;
         if (p.variants) {
             p.variants.forEach((v: any) => {
                 const sku = v.sku ? String(v.sku).toUpperCase().trim() : "";
                 if (!sku) return;
                 // Priority: variant-specific image > variant thumbnail > product image
                 const imageUrl = v.metadata?.image_url || v.thumbnail || productFallbackImage;
                 if (imageUrl) {
                     skuToImageUrl[sku] = String(imageUrl).trim();
                 }
             });
         }
     });

     const allProducts = [
         ...(Array.isArray(createdProducts) ? createdProducts : []),
         ...(Array.isArray(updatedProducts) ? updatedProducts : [])
     ];
     const productIds = allProducts.map((p: any) => p.id).filter(Boolean);

     if (productIds.length === 0) {
         console.log("[Sync] No product IDs for variant image linking.");
         return new StepResponse({ done: true });
     }

     // Query DB for products with images and variants
     const query = remoteQuery({
         entryPoint: "product",
         fields: ["id", "thumbnail", "variants.id", "variants.sku", "images.id", "images.url"],
         variables: { filters: { id: productIds } }
     });
     const dbProducts = await query as any[];

     // Query existing variant-image links to avoid duplicates
     const allVariantIds = dbProducts.flatMap((p: any) => (p.variants || []).map((v: any) => v.id)).filter(Boolean);
     const existingLinks = new Set<string>();
     if (allVariantIds.length > 0) {
         const existingQuery = remoteQuery({
             entryPoint: "product_variant",
             fields: ["id", "images.id"],
             variables: { filters: { id: allVariantIds } }
         });
         const existingVariants = await existingQuery as any[];
         existingVariants.forEach((v: any) => {
             (v.images || []).forEach((img: any) => {
                 existingLinks.add(`${v.id}::${img.id}`);
             });
         });
     }

     const linksToBuild: any[] = [];
     const thumbnailUpdates: any[] = [];

     for (const dbProd of dbProducts) {
         const prodImages = dbProd.images || [];
         const prodVariants = dbProd.variants || [];
         if (prodImages.length === 0) continue;

         for (const v of prodVariants) {
             const key = v.sku ? String(v.sku).toUpperCase().trim() : "";
             if (!key) continue;

             let matchedImage: any = null;

             // Try to match variant's specific image URL to a product image
             const targetUrl = skuToImageUrl[key];
             if (targetUrl) {
                 const cleanTarget = String(targetUrl).split('?')[0].trim();
                 const targetFileName = cleanTarget.split('/').pop() || cleanTarget;

                 matchedImage = prodImages.find((img: any) => {
                     if (!img.url) return false;
                     const dbUrl = String(img.url).split('?')[0].trim();
                     const dbFileName = dbUrl.split('/').pop() || dbUrl;
                     return dbUrl === cleanTarget
                         || dbUrl.includes(cleanTarget)
                         || cleanTarget.includes(dbUrl)
                         || (dbFileName && targetFileName && dbFileName === targetFileName);
                 });
             }

             // Fallback: use first product image
             if (!matchedImage) {
                 matchedImage = prodImages[0];
             }

             if (matchedImage) {
                 const linkKey = `${v.id}::${matchedImage.id}`;
                 if (!existingLinks.has(linkKey)) {
                     linksToBuild.push({ variant_id: v.id, image_id: matchedImage.id });
                 }
                 thumbnailUpdates.push({ id: v.id, thumbnail: matchedImage.url });
             }
         }
     }

     // Link images to variants in small batches
     console.log(`[Sync] linksToBuild count: ${linksToBuild.length}, thumbnailUpdates count: ${thumbnailUpdates.length}`);
     let linkedCount = 0;
     const BATCH_SIZE = 20;
     for (let i = 0; i < linksToBuild.length; i += BATCH_SIZE) {
         const batch = linksToBuild.slice(i, i + BATCH_SIZE);
         try {
             await productService.addImageToVariant(batch);
             linkedCount += batch.length;
         } catch (e: any) {
             console.error(`[Sync] addImageToVariant batch ${i}-${i + batch.length} error:`, e.message, e.stack?.substring(0, 300));
             // Try one by one as fallback
             for (const link of batch) {
                 try {
                     await productService.addImageToVariant([link]);
                     linkedCount++;
                 } catch (innerErr: any) {
                     console.error(`[Sync] addImageToVariant single failed: variant=${link.variant_id} image=${link.image_id}: ${innerErr.message}`);
                 }
             }
         }
     }
     console.log(`[Sync] Linked ${linkedCount}/${linksToBuild.length} images to variants.`);

     // Update variant thumbnails one by one
     let thumbCount = 0;
     for (const upd of thumbnailUpdates) {
         try {
             await productService.updateProductVariants(upd.id, { thumbnail: upd.thumbnail });
             thumbCount++;
         } catch (e: any) {
             console.error(`[Sync] Failed to set thumbnail for variant ${upd.id}:`, e.message);
         }
     }

     console.log(`[Sync] Variant images: ${linkedCount} new links, ${thumbCount} thumbnails updated.`);
     return new StepResponse({ done: true, linked: linkedCount, thumbnails: thumbCount });
  }
);

// --- STEP: Deep Inventory Linking ---
export const syncInventoryLevelsStep = createStep("sync-inventory-levels", async (input: { skuToQuantityMap: Record<string, number> }, { container }) => {
   const { skuToQuantityMap } = input;
   
   try {
       const inventoryModule = container.resolve(Modules.INVENTORY);
       const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
       const productModule = container.resolve(Modules.PRODUCT);
       const remoteLink = container.resolve("remoteLink");
       const remoteQuery = container.resolve("remoteQuery");
       
       // 1. Get default Location ID
       const locations = await stockLocationModule.listStockLocations({}, { take: 1 });
       if (locations.length === 0) {
           console.log("[Sync] NO STOCK LOCATION FOUND. Skipping inventory link.");
           return new StepResponse({ success: false });
       }
       const locationId = locations[0].id;
       
       // 2. Fetch Medusa Variants for mapped SKUs
       const skus = Object.keys(skuToQuantityMap);
       if (skus.length === 0) return new StepResponse({ success: true });
       
       const allVariants = await productModule.listProductVariants({ sku: skus }, { take: 5000 });
       const variantSkus = allVariants.map(v => v.id);
       
       // 3. Request associated Inventory Item IDs via Remote Query
       const query = remoteQuery({
           entryPoint: "variant",
           fields: ["id", "sku", "inventory_items.inventory_item_id"],
           variables: { filters: { id: variantSkus } }
       });
       const queriedVariants = await query;
       
       // 4. Determine items missing levels & map quantities
       for (const qv of queriedVariants) {
           const sku = (qv as any).sku;
           const targetQty = skuToQuantityMap[sku];
           if (targetQty === undefined) continue;
           
           const invItems = (qv as any).inventory_items || [];
           if (invItems.length === 0) continue; // Safety check in case manage_inventory failed to create item
           
           const invItemId = invItems[0].inventory_item_id;
           
           // Fetch existing level for this item at our location
           const existingLevels = await inventoryModule.listInventoryLevels({ inventory_item_id: invItemId, location_id: locationId });
           
           if (existingLevels.length > 0) {
               // Update level
               await inventoryModule.updateInventoryLevels([
                   { inventory_item_id: invItemId, location_id: locationId, stocked_quantity: targetQty }
               ]);
           } else {
               // Create level
               await inventoryModule.createInventoryLevels([
                   { inventory_item_id: invItemId, location_id: locationId, stocked_quantity: targetQty }
               ]);
           }
       }
       
       console.log(`[Sync] Updated inventory levels for ${queriedVariants.length} variants at location ${locationId}`);
       return new StepResponse({ success: true });
   } catch (err) {
       console.error("[Sync] Inventory mapping failed:", err);
       return new StepResponse({ success: false });
   }
});

// --- STEP: Sync Product Content (entity_content module) ---
export const syncProductContentStep = createStep(
  "sync-product-content",
  async (input: { createdProducts: any[], updatedProducts: any[], mappedProducts: any[] }, { container }) => {
    const { createdProducts, updatedProducts, mappedProducts } = input;
    const contentService = container.resolve(ENTITY_CONTENT_MODULE);
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Build external_id -> content HTML map from mapped data
    const extIdToContent: Record<string, string> = {};
    mappedProducts.forEach((p: any) => {
      const html = p.metadata?.nhanh_content_html;
      if (html && p.external_id) {
        extIdToContent[p.external_id] = html;
      }
    });

    if (Object.keys(extIdToContent).length === 0) {
      console.log("[Sync] No product content to sync.");
      return new StepResponse({ done: true, synced: 0 });
    }

    const allProducts = [
      ...(Array.isArray(createdProducts) ? createdProducts : []),
      ...(Array.isArray(updatedProducts) ? updatedProducts : []),
    ];

    let synced = 0;
    for (const product of allProducts) {
      const contentHtml = extIdToContent[product.external_id];
      if (!contentHtml || !product.id) continue;

      // Check if product already has linked entity_content
      const { data: existing } = await query.graph({
        entity: "product",
        fields: ["entity_content.*"],
        filters: { id: product.id },
      });

      const existingContent = (existing as any)?.[0]?.entity_content;

      if (existingContent?.id) {
        // Update existing content
        await contentService.updateEntityContents(existingContent.id, { content: contentHtml });
      } else {
        // Create new content and link to product
        const [created] = await contentService.createEntityContents([{ content: contentHtml }]);
        await remoteLink.create({
          [Modules.PRODUCT]: { product_id: product.id },
          [ENTITY_CONTENT_MODULE]: { entity_content_id: created.id },
        });
      }
      synced++;
    }

    console.log(`[Sync] Synced content for ${synced} products.`);
    return new StepResponse({ done: true, synced });
  }
);

export const syncNhanhProductsWorkflow = createWorkflow(
  "sync-nhanh-products-workflow",
  (input: any) => {
    // 1. Sync dependencies
    const catStep = syncNhanhCategoriesStep();
    const brandStep = syncNhanhBrandsStep();
    
    // 2. Fetch and format
    const fetchStepProcess = fetchAndProcessNhanhProductsStep({ 
        categoryMap: catStep.categoryMap, 
        brandMap: brandStep.brandMap 
    });
    
    // 3. Diff checking
    const splitResult = distributeMedusaProductsStep({ products: fetchStepProcess.products });
    
    // 4. Execute Core Workflows conditionally
    const createResult = createProductsWorkflow.runAsStep({ 
        input: { products: splitResult.productsToCreate } 
    });
    
    updateProductsWorkflow.runAsStep({ 
        input: { products: splitResult.productsToUpdate } 
    });

    // 5. Connect Links for updated items (We use Remote Link API securely)
    createRemoteLinkStep(splitResult.brandLinks);

    // 6. Connect Links for NEW items
    linkNewProductsBrandsStep({
        createdProducts: createResult as any,
        mappedProducts: fetchStepProcess.products
    });

    // 7. Explicit Inventory Sync
    syncInventoryLevelsStep({
        skuToQuantityMap: fetchStepProcess.skuToQuantityMap
    });

    // 8. Force set variant thumbnails
    forceSetVariantThumbnailsStep({
        createdProducts: createResult as any,
        updatedProducts: splitResult.productsToUpdate,
        mappedProducts: fetchStepProcess.products
    });

    // 9. Sync product content (entity_content module)
    syncProductContentStep({
        createdProducts: createResult as any,
        updatedProducts: splitResult.productsToUpdate,
        mappedProducts: fetchStepProcess.products
    });

    return new WorkflowResponse({ processed: true });
  }
);
