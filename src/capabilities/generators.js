const FIRST_NAMES = ['Avery', 'Jordan', 'Morgan', 'Riley', 'Taylor', 'Samira', 'Nadia', 'Arif', 'Rafi', 'Maya'];
const LAST_NAMES = ['Rahman', 'Ahmed', 'Carter', 'Khan', 'Hasan', 'Lewis', 'Morgan', 'Islam', 'Chowdhury', 'Patel'];
const STREETS = ['Maple Avenue', 'River Road', 'Garden Street', 'Station Lane', 'Meadow Drive', 'Lake View Road'];
const CITIES = [['Dhaka', '1207', 'Bangladesh'], ['Chattogram', '4000', 'Bangladesh'], ['Austin', '78701', 'USA'], ['Toronto', 'M5V 2T6', 'Canada'], ['Manchester', 'M1 1AE', 'UK']];

function pick(values, random) { return values[Math.floor(random() * values.length)]; }

export function generateSyntheticIdentity(random = Math.random) {
  const [city, postalCode, country] = pick(CITIES, random);
  return {
    synthetic: true,
    firstName: pick(FIRST_NAMES, random),
    lastName: pick(LAST_NAMES, random),
    address: `${Math.floor(random() * 899) + 100} ${pick(STREETS, random)}`,
    city,
    postalCode,
    country
  };
}
