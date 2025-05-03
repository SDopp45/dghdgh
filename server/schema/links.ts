import { 
  integer, 
  pgTable, 
  serial, 
  text, 
  varchar, 
  timestamp, 
  boolean,
  json,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../../shared/schema';

// Link profiles table to store user's linktree page settings
export const linkProfiles = pgTable('link_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  backgroundColor: varchar('background_color', { length: 20 }).default('#ffffff'),
  textColor: varchar('text_color', { length: 20 }).default('#000000'),
  accentColor: varchar('accent_color', { length: 20 }).default('#70C7BA'),
  logoUrl: text('logo_url'),
  views: integer('views').default(0),
  backgroundImage: text('background_image'),
  backgroundPattern: text('background_pattern'),
  buttonStyle: varchar('button_style', { length: 20 }).default('rounded'),
  buttonRadius: integer('button_radius').default(8),
  fontFamily: varchar('font_family', { length: 50 }).default('Inter'),
  animation: varchar('animation', { length: 30 }).default('fade'),
  customCss: text('custom_css'),
  customTheme: json('custom_theme').$type<Record<string, any>>(),
  backgroundSaturation: integer('background_saturation').default(100),
  backgroundHueRotate: integer('background_hue_rotate').default(0),
  backgroundSepia: integer('background_sepia').default(0),
  backgroundGrayscale: integer('background_grayscale').default(0),
  backgroundInvert: integer('background_invert').default(0),
  backgroundColorFilter: varchar('background_color_filter', { length: 20 }),
  backgroundColorFilterOpacity: real('background_color_filter_opacity').default(0.3),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Individual links within a link profile
export const links = pgTable('links', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').references(() => linkProfiles.id).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  url: text('url').notNull(),
  icon: varchar('icon', { length: 50 }),
  enabled: boolean('enabled').default(true),
  clicks: integer('clicks').default(0),
  position: integer('position').default(0),
  featured: boolean('featured').default(false),
  customColor: varchar('custom_color', { length: 20 }),
  customTextColor: varchar('custom_text_color', { length: 20 }),
  animation: varchar('animation', { length: 30 }),
  type: varchar('type', { length: 20 }).default('link'),
  formDefinition: json('form_definition').$type<Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Table for storing form submissions
export const formSubmissions = pgTable('form_submissions', {
  id: serial('id').primaryKey(),
  linkId: integer('link_id').references(() => links.id).notNull(),
  formData: json('form_data').$type<Record<string, any>>().notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const linkProfilesRelations = relations(linkProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [linkProfiles.userId],
    references: [users.id]
  }),
  links: many(links)
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  profile: one(linkProfiles, {
    fields: [links.profileId],
    references: [linkProfiles.id]
  }),
  submissions: many(formSubmissions)
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  link: one(links, {
    fields: [formSubmissions.linkId],
    references: [links.id]
  })
})); 