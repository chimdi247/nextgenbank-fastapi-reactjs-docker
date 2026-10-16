import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .conftest import BASE_URL, sign_in, wait

pytestmark = pytest.mark.e2e


def test_login_page_renders(driver):
    driver.get(f"{BASE_URL}/login")
    wait(driver).until(EC.presence_of_element_located((By.ID, "email")))
    assert "Welcome back" in driver.page_source


def test_wrong_credentials_show_an_error(driver):
    driver.get(f"{BASE_URL}/login")
    wait(driver).until(EC.presence_of_element_located((By.ID, "email")))
    driver.find_element(By.ID, "password").clear(); driver.find_element(By.ID, "password").send_keys("not-the-password")
    driver.find_element(By.XPATH, "//button[normalize-space()='Continue']").click()
    wait(driver).until(lambda d: "Verify" not in d.page_source and d.find_elements(By.CSS_SELECTOR, "[data-sonner-toast]"))


def test_admin_login_reaches_operations_overview(driver):
    sign_in(driver, "admin@example.com")
    wait(driver).until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Welcome')]")))
    assert "Customers" in driver.page_source


def test_customer_sees_accounts_and_transfer_page(driver):
    sign_in(driver, "alice@example.com")
    wait(driver).until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Good day')]")))
    wait(driver).until(lambda d: "4200 0000 0000 0001" in d.page_source)
    driver.find_element(By.LINK_TEXT, "Transfer").click()
    wait(driver).until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Send money')]")))


def test_customer_cannot_open_staff_pages(driver):
    sign_in(driver, "alice@example.com")
    wait(driver).until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Good day')]")))
    driver.get(f"{BASE_URL}/teller")
    wait(driver).until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Good day')]")))


def test_teller_lands_on_the_teller_desk(driver):
    sign_in(driver, "teller@example.com")
    wait(driver).until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Teller desk')]")))
