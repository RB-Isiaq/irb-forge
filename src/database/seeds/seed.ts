import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { Membership } from '../../modules/memberships/entities/membership.entity';
import { Program } from '../../modules/programs/entities/program.entity';
import { Enrollment } from '../../modules/enrollments/entities/enrollment.entity';
import { Message } from '../../modules/messages/entities/message.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { MembershipRole } from '../../modules/memberships/enums/membership-role.enum';
import { ProgramStatus } from '../../modules/programs/enums/program-status.enum';
import { EnrollmentStatus } from '../../modules/enrollments/enums/enrollment-status.enum';

const SEED_DOMAIN = '@irb-seed.dev';
const SEED_SLUGS = ['irb-academy', 'dev-mentors'];
const PASSWORD = 'Password1';

async function seed() {
  console.log('\n🌱  Starting seed...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  const ds = app.get<DataSource>(getDataSourceToken());

  // ── Wipe existing seed data (order respects FK constraints) ──────────────
  console.log('🧹  Clearing existing seed data...');
  await ds.query(
    `DELETE FROM messages WHERE "organizationId" IN (SELECT id FROM organizations WHERE slug = ANY($1))`,
    [SEED_SLUGS],
  );
  await ds.query(
    `DELETE FROM enrollments WHERE "programId" IN (
      SELECT id FROM programs WHERE "organizationId" IN (
        SELECT id FROM organizations WHERE slug = ANY($1)
      )
    )`,
    [SEED_SLUGS],
  );
  await ds.query(
    `DELETE FROM programs WHERE "organizationId" IN (SELECT id FROM organizations WHERE slug = ANY($1))`,
    [SEED_SLUGS],
  );
  await ds.query(
    `DELETE FROM memberships WHERE "organizationId" IN (SELECT id FROM organizations WHERE slug = ANY($1))`,
    [SEED_SLUGS],
  );
  await ds.query(`DELETE FROM organizations WHERE slug = ANY($1)`, [
    SEED_SLUGS,
  ]);
  await ds.query(`DELETE FROM users WHERE email LIKE $1`, [`%${SEED_DOMAIN}`]);

  // ── Users ────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash(PASSWORD, 10);
  const userRepo = ds.getRepository(User);

  // Super admin — platform-level account, not a member of any org
  await userRepo.save(
    userRepo.create({
      email: `superadmin${SEED_DOMAIN}`,
      password: hash,
      firstName: 'Super',
      lastName: 'Admin',
      isVerified: true,
      role: UserRole.SUPER_ADMIN,
    }),
  );
  console.log('✅  Super admin created');

  const [owner, admin, mentor, member, member2] = await userRepo.save([
    userRepo.create({
      email: `owner${SEED_DOMAIN}`,
      password: hash,
      firstName: 'Oluwaseun',
      lastName: 'Owner',
      isVerified: true,
      role: UserRole.USER,
    }),
    userRepo.create({
      email: `admin${SEED_DOMAIN}`,
      password: hash,
      firstName: 'Amira',
      lastName: 'Admin',
      isVerified: true,
      role: UserRole.USER,
    }),
    userRepo.create({
      email: `mentor${SEED_DOMAIN}`,
      password: hash,
      firstName: 'Mustapha',
      lastName: 'Mentor',
      isVerified: true,
      role: UserRole.USER,
    }),
    userRepo.create({
      email: `member${SEED_DOMAIN}`,
      password: hash,
      firstName: 'Mimi',
      lastName: 'Member',
      isVerified: true,
      role: UserRole.USER,
    }),
    userRepo.create({
      email: `member2${SEED_DOMAIN}`,
      password: hash,
      firstName: 'Musa',
      lastName: 'Member',
      isVerified: true,
      role: UserRole.USER,
    }),
  ]);
  console.log('✅  5 users created');

  // ── Organizations ────────────────────────────────────────────────────────
  const orgRepo = ds.getRepository(Organization);

  const [academy, devMentors] = await orgRepo.save([
    orgRepo.create({
      name: 'IRB Academy',
      slug: 'irb-academy',
      description: 'A community for aspiring engineers.',
      ownerId: owner.id,
    }),
    orgRepo.create({
      name: 'Dev Mentors',
      slug: 'dev-mentors',
      description: 'Senior devs mentoring juniors.',
      ownerId: owner.id,
    }),
  ]);
  console.log('✅  2 organizations created');

  // ── Memberships ──────────────────────────────────────────────────────────
  const membershipRepo = ds.getRepository(Membership);

  await membershipRepo.save([
    // IRB Academy
    membershipRepo.create({
      userId: owner.id,
      organizationId: academy.id,
      role: MembershipRole.OWNER,
    }),
    membershipRepo.create({
      userId: admin.id,
      organizationId: academy.id,
      role: MembershipRole.ADMIN,
    }),
    membershipRepo.create({
      userId: mentor.id,
      organizationId: academy.id,
      role: MembershipRole.MENTOR,
    }),
    membershipRepo.create({
      userId: member.id,
      organizationId: academy.id,
      role: MembershipRole.MEMBER,
    }),
    membershipRepo.create({
      userId: member2.id,
      organizationId: academy.id,
      role: MembershipRole.MEMBER,
    }),
    // Dev Mentors
    membershipRepo.create({
      userId: owner.id,
      organizationId: devMentors.id,
      role: MembershipRole.OWNER,
    }),
    membershipRepo.create({
      userId: member.id,
      organizationId: devMentors.id,
      role: MembershipRole.MEMBER,
    }),
  ]);
  console.log('✅  7 memberships created');

  // ── Programs ─────────────────────────────────────────────────────────────
  const programRepo = ds.getRepository(Program);

  const [backendProg] = await programRepo.save([
    programRepo.create({
      organizationId: academy.id,
      createdById: mentor.id,
      name: 'Backend Fundamentals',
      description:
        '12-week cohort covering APIs, databases, and system architecture.',
      status: ProgramStatus.ACTIVE,
      capacity: 50,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
    }),
    programRepo.create({
      organizationId: academy.id,
      createdById: admin.id,
      name: 'Frontend Crash Course',
      description: 'React, TypeScript, and modern frontend tooling.',
      status: ProgramStatus.DRAFT,
      capacity: 30,
    }),
    programRepo.create({
      organizationId: academy.id,
      createdById: mentor.id,
      name: 'System Design',
      description: 'Scalable system design patterns and case studies.',
      status: ProgramStatus.COMPLETED,
      capacity: 20,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
    }),
  ]);
  console.log('✅  3 programs created');

  // ── Enrollments ──────────────────────────────────────────────────────────
  const enrollmentRepo = ds.getRepository(Enrollment);

  await enrollmentRepo.save([
    enrollmentRepo.create({
      userId: member.id,
      programId: backendProg.id,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
    }),
    enrollmentRepo.create({
      userId: member2.id,
      programId: backendProg.id,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
    }),
  ]);
  console.log('✅  2 enrollments created');

  // ── Messages ─────────────────────────────────────────────────────────────
  const messageRepo = ds.getRepository(Message);

  await messageRepo.save([
    messageRepo.create({
      organizationId: academy.id,
      authorId: admin.id,
      content:
        "Welcome to IRB Academy! We're excited to have you here. Check out the available programs and enroll in what interests you.",
    }),
    messageRepo.create({
      organizationId: academy.id,
      authorId: mentor.id,
      content:
        'Backend Fundamentals is now open for enrollment — kicks off June 1st. Limited to 50 spots.',
    }),
  ]);
  console.log('✅  2 messages created');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🎉  Seed complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Orgs
   irb-academy   IRB Academy (5 members)
   dev-mentors   Dev Mentors  (2 members)

 Credentials  (password: ${PASSWORD})
   superadmin${SEED_DOMAIN}  super_admin (no org)
   owner${SEED_DOMAIN}       owner of both orgs
   admin${SEED_DOMAIN}       admin  in IRB Academy
   mentor${SEED_DOMAIN}      mentor in IRB Academy
   member${SEED_DOMAIN}      member in both orgs
   member2${SEED_DOMAIN}     member in IRB Academy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  await app.close();
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
