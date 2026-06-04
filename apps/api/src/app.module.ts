import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { SearchModule } from './search/search.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { TestModule } from './test/test.module';
import { AdminModule } from './admin/admin.module';
import { AddressesModule } from './addresses/addresses.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StockAlertsModule } from './stock-alerts/stock-alerts.module';
import { GeoModule } from './geo/geo.module';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '1d' },
    }),
    AuthModule,
    CacheModule,
    // SearchModule before ProductsModule so /products/search +
    // /products/suggestions are matched before /products/:id.
    SearchModule,
    RecommendationsModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    TestModule,
    AdminModule,
    AddressesModule,
    WishlistModule,
    ReviewsModule,
    StockAlertsModule,
    GeoModule,
    MeModule,
  ],
})
export class AppModule {}
