import { Module } from "@nestjs/common";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { R2Service } from "./r2.service";
import JimpHelperService from "./jimp-helper.service";
import { StorageImageProcessingService } from "./image-processing.service";

@Module({
  imports: [],
  controllers: [StorageController],
  providers: [
    StorageService,
    R2Service,
    JimpHelperService,
    StorageImageProcessingService,
  ],
  exports: [StorageService, R2Service],
})
export class StorageModule {}
