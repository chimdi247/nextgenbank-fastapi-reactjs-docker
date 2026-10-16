import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from common.mailpit import existing_ids, wait_for_otp

BASE_URL = os.getenv("BASE_URL", "http://localhost:8088")
SELENIUM_URL = os.getenv("SELENIUM_URL", "http://localhost:4444/wd/hub")


@pytest.fixture()
def driver():
    opts = Options()
    opts.add_argument("--window-size=1440,1000")
    opts.add_argument("--no-sandbox")
    d = webdriver.Remote(command_executor=SELENIUM_URL, options=opts)
    d.implicitly_wait(2)
    yield d
    d.quit()


def wait(driver, timeout=20):
    return WebDriverWait(driver, timeout)


def sign_in(driver, email, password="password123"):
    driver.get(f"{BASE_URL}/login")
    seen = existing_ids(email)
    wait(driver).until(EC.presence_of_element_located((By.ID, "email")))
    driver.find_element(By.ID, "email").clear(); driver.find_element(By.ID, "email").send_keys(email)
    driver.find_element(By.ID, "password").clear(); driver.find_element(By.ID, "password").send_keys(password)
    driver.find_element(By.XPATH, "//button[normalize-space()='Continue']").click()
    wait(driver).until(EC.presence_of_element_located((By.ID, "otp")))
    driver.find_element(By.ID, "otp").send_keys(wait_for_otp(email, after_ids=seen))
    driver.find_element(By.XPATH, "//button[contains(., 'Verify')]").click()
